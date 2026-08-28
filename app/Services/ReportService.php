<?php

declare(strict_types=1);

namespace App\Services;

use InvalidArgumentException;
use PDO;
use RuntimeException;

final class ReportService
{
    private HealthClassifier $classifier;
    private SpeciesMatcher $matcher;
    private UploadService $uploads;

    public function __construct(private readonly PDO $pdo)
    {
        $this->classifier = new HealthClassifier($pdo);
        $this->matcher = new SpeciesMatcher($pdo);
        $this->uploads = new UploadService();
    }

    /** @return array<string,mixed> */
    public function formData(array $user): array
    {
        $clusterSql =
            'SELECT c.id, c.cluster_code, c.name, c.sitio_name, c.center_lat, c.center_lng,
                    c.radius_meters, c.latest_health, c.rarity_level, b.name AS barangay_name
             FROM mangrove_clusters c JOIN barangays b ON b.id = c.barangay_id';
        $params = [];
        if (($user['role'] ?? '') === 'guardian') {
            if (!empty($user['barangay_id'])) {
                $clusterSql .= ' WHERE c.barangay_id = :barangay_id';
                $params['barangay_id'] = (int) $user['barangay_id'];
            } else {
                $clusterSql .= ' WHERE 1 = 0';
            }
        }
        $clusterSql .= ' ORDER BY b.name, c.name';
        $clusterStatement = $this->pdo->prepare($clusterSql);
        $clusterStatement->execute($params);

        $species = $this->pdo->query(
            'SELECT id, scientific_name, common_name, root_type, leaf_shape, bark_texture
             FROM mangrove_species WHERE active = 1 ORDER BY scientific_name'
        )->fetchAll();

        $traits = [];
        foreach (['root_type', 'leaf_shape', 'bark_texture'] as $field) {
            $values = array_map(static fn (array $row): string => trim((string) $row[$field]), $species);
            $values = array_values(array_unique(array_filter($values)));
            natcasesort($values);
            $traits[$field] = array_values($values);
        }

        return [
            'criteria' => $this->classifier->criteriaWithOptions(),
            'clusters' => $clusterStatement->fetchAll(),
            'species' => $species,
            'traits' => $traits,
        ];
    }

    /**
     * Validates and stores a complete report and every selected observation.
     * The report and observation rows are committed together as pending.
     *
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $photo
     * @return array<string,mixed>
     */
    public function submitGuardianReport(int $userId, array $payload, array $photo): array
    {
        $userStatement = $this->pdo->prepare(
            "SELECT u.id, u.role, u.barangay_id, b.center_lat AS barangay_center_lat,
                    b.center_lng AS barangay_center_lng
             FROM users u
             LEFT JOIN barangays b ON b.id = u.barangay_id
             WHERE u.id = :id AND u.status = 'active' LIMIT 1"
        );
        $userStatement->execute(['id' => $userId]);
        $user = $userStatement->fetch();
        if (!$user || $user['role'] !== 'guardian') {
            throw new InvalidArgumentException('Only active guardians can submit monitoring reports.');
        }
        $fieldConfirmation = $payload['field_confirmation'] ?? null;
        if (!is_scalar($fieldConfirmation) || (string) $fieldConfirmation !== '1') {
            throw new InvalidArgumentException('Confirm that the photo, location, and observations are from this field visit.');
        }
        $barangayId = (int) ($user['barangay_id'] ?? 0);
        if ($barangayId < 1) {
            throw new InvalidArgumentException('Add a barangay to your profile before submitting a report.');
        }

        $clusterId = $this->positiveIntOrNull($payload['cluster_id'] ?? null);
        $parentId = $this->positiveIntOrNull($payload['parent_report_id'] ?? null);
        if ($parentId !== null) {
            $parentStatement = $this->pdo->prepare(
                "SELECT id, cluster_id FROM reports
                 WHERE id = :id AND user_id = :user_id AND status = 'verified'
                   AND NOT EXISTS (
                       SELECT 1 FROM reports child
                       WHERE child.parent_report_id = reports.id AND child.status IN ('pending', 'verified')
                   )
                 LIMIT 1"
            );
            $parentStatement->execute(['id' => $parentId, 'user_id' => $userId]);
            $parent = $parentStatement->fetch();
            if (!$parent || empty($parent['cluster_id'])) {
                throw new InvalidArgumentException('The selected follow-up report is not available.');
            }
            $parentCluster = (int) $parent['cluster_id'];
            if ($clusterId !== null && $clusterId !== $parentCluster) {
                throw new InvalidArgumentException('The follow-up report must use the same cluster as its parent.');
            }
            $clusterId = $parentCluster;
        }

        $rarity = 'Unassigned';
        if ($clusterId !== null) {
            $clusterStatement = $this->pdo->prepare(
                'SELECT id, rarity_level FROM mangrove_clusters
                 WHERE id = :id AND barangay_id = :barangay_id LIMIT 1'
            );
            $clusterStatement->execute(['id' => $clusterId, 'barangay_id' => $barangayId]);
            $cluster = $clusterStatement->fetch();
            if (!$cluster) {
                throw new InvalidArgumentException('The selected cluster is not in your barangay.');
            }
            $rarity = (string) $cluster['rarity_level'];
        }

        $latitude = $this->coordinate($payload['latitude'] ?? null, -90, 90, 'latitude');
        $longitude = $this->coordinate($payload['longitude'] ?? null, -180, 180, 'longitude');
        $distanceFromBarangay = self::distanceMeters(
            $latitude,
            $longitude,
            (float) $user['barangay_center_lat'],
            (float) $user['barangay_center_lng']
        );
        if ($distanceFromBarangay > (float) \config('barangay_max_distance_meters', 5000)) {
            throw new InvalidArgumentException('The selected location is too far from your barangay. Check the GPS reading or map pin before submitting.');
        }
        $locationSource = is_string($payload['location_source'] ?? null)
            ? (string) $payload['location_source']
            : '';
        if (!in_array($locationSource, ['gps', 'manual'], true)) {
            throw new InvalidArgumentException('Capture your location or place the map pin manually.');
        }
        $accuracy = null;
        if (($payload['location_accuracy'] ?? '') !== '') {
            if (!is_numeric($payload['location_accuracy'])) {
                throw new InvalidArgumentException('Location accuracy is not valid.');
            }
            $accuracy = round((float) $payload['location_accuracy'], 2);
            if ($accuracy < 0 || $accuracy > 999999.99) {
                throw new InvalidArgumentException('Location accuracy is outside the supported range.');
            }
        }
        if ($locationSource === 'gps' && $accuracy === null) {
            throw new InvalidArgumentException('GPS accuracy is missing. Capture your location again.');
        }
        if ($locationSource === 'manual') {
            $accuracy = null;
        }

        $sitio = $this->cleanText($payload['sitio_name'] ?? '', 120, 'Sitio or location name');
        $remarks = $this->cleanText($payload['guardian_remarks'] ?? '', 5000, 'Remarks', true);
        $rootType = $this->cleanText($payload['root_type'] ?? '', 190, 'Root type');
        $leafShape = $this->cleanText($payload['leaf_shape'] ?? '', 190, 'Leaf shape');
        $barkTexture = $this->cleanText($payload['bark_texture'] ?? '', 255, 'Bark texture');

        $rawAliveCount = $payload['observed_alive_count'] ?? null;
        if (!is_scalar($rawAliveCount) || trim((string) $rawAliveCount) === '') {
            throw new InvalidArgumentException('Enter the number of mangroves observed alive during this visit.');
        }
        $aliveCount = filter_var((string) $rawAliveCount, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 0, 'max_range' => 1000000],
        ]);
        if ($aliveCount === false) {
            throw new InvalidArgumentException('Observed living mangroves must be a whole number from 0 to 1,000,000.');
        }
        if ($clusterId === null && $aliveCount < 1) {
            throw new InvalidArgumentException('A new observation site needs at least one living mangrove to establish its survival baseline.');
        }

        $rawObservations = $payload['observations'] ?? [];
        if (!is_array($rawObservations)) {
            throw new InvalidArgumentException('The health checklist is not valid.');
        }
        $classification = $this->classifier->classify($rawObservations);
        $matching = $this->matcher->match([
            'root_type' => $rootType,
            'leaf_shape' => $leafShape,
            'bark_texture' => $barkTexture,
        ]);
        $best = $matching['best'];

        $storedPhoto = $this->uploads->storeReportPhoto($photo);
        try {
            $result = \Database::transaction(function (PDO $pdo) use (
                $userId,
                $barangayId,
                $clusterId,
                $parentId,
                $latitude,
                $longitude,
                $accuracy,
                $sitio,
                $storedPhoto,
                $remarks,
                $rootType,
                $leafShape,
                $barkTexture,
                $best,
                $classification,
                $aliveCount,
                $rarity
            ): array {
                $submitterLock = $pdo->prepare(
                    "SELECT id FROM users
                     WHERE id = :id AND role = 'guardian' AND status = 'active'
                       AND barangay_id = :barangay_id
                     LIMIT 1 FOR UPDATE"
                );
                $submitterLock->execute(['id' => $userId, 'barangay_id' => $barangayId]);
                if (!$submitterLock->fetchColumn()) {
                    throw new InvalidArgumentException('Your account or barangay assignment changed. Refresh the page before submitting.');
                }

                $recentSubmissions = $pdo->prepare(
                    'SELECT COUNT(*) FROM reports
                     WHERE user_id = :user_id AND submitted_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'
                );
                $recentSubmissions->execute(['user_id' => $userId]);
                if ((int) $recentSubmissions->fetchColumn() >= (int) \config('report_submission_limit_per_hour', 12)) {
                    throw new InvalidArgumentException('You have reached the hourly report limit. Wait before submitting more field evidence.');
                }

                $pendingSubmissions = $pdo->prepare(
                    "SELECT COUNT(*) FROM reports WHERE user_id = :user_id AND status = 'pending'"
                );
                $pendingSubmissions->execute(['user_id' => $userId]);
                if ((int) $pendingSubmissions->fetchColumn() >= (int) \config('pending_report_limit_per_guardian', 25)) {
                    throw new InvalidArgumentException('Your pending-report queue is full. Wait for expert review before submitting more reports.');
                }

                $duplicatePhoto = $pdo->prepare(
                    'SELECT id FROM reports
                     WHERE user_id = :user_id AND photo_sha256 = :photo_sha256
                       AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                     LIMIT 1'
                );
                $duplicatePhoto->execute([
                    'user_id' => $userId,
                    'photo_sha256' => $storedPhoto['sha256'],
                ]);
                if ($duplicatePhoto->fetchColumn()) {
                    throw new InvalidArgumentException('This exact photo was already submitted recently. Capture fresh evidence for each field visit.');
                }

                if ($parentId !== null) {
                    $parentLock = $pdo->prepare(
                        "SELECT parent.id FROM reports parent
                         WHERE parent.id = :parent_id AND parent.user_id = :user_id
                           AND parent.cluster_id = :cluster_id AND parent.status = 'verified'
                           AND NOT EXISTS (
                               SELECT 1 FROM reports child
                               WHERE child.parent_report_id = parent.id
                                 AND child.status IN ('pending', 'verified')
                           )
                         LIMIT 1 FOR UPDATE"
                    );
                    $parentLock->execute([
                        'parent_id' => $parentId,
                        'user_id' => $userId,
                        'cluster_id' => $clusterId,
                    ]);
                    if (!$parentLock->fetchColumn()) {
                        throw new InvalidArgumentException('That report already has a follow-up or is no longer available.');
                    }
                }

                $reportCode = $this->newReportCode();
                $statement = $pdo->prepare(
                    "INSERT INTO reports
                        (report_code, user_id, barangay_id, cluster_id, parent_report_id,
                         latitude, longitude, location_accuracy, sitio_name, photo_path,
                         photo_original_name, photo_mime, photo_sha256, guardian_remarks,
                         root_type, leaf_shape, bark_texture, suggested_species_id,
                         species_confidence, health_score, health_max_score, environmental_score,
                         suggested_health, observed_alive_count, status, rarity_level)
                     VALUES
                        (:report_code, :user_id, :barangay_id, :cluster_id, :parent_report_id,
                         :latitude, :longitude, :location_accuracy, :sitio_name, :photo_path,
                         :photo_original_name, :photo_mime, :photo_sha256, :guardian_remarks,
                         :root_type, :leaf_shape, :bark_texture, :suggested_species_id,
                         :species_confidence, :health_score, :health_max_score, :environmental_score,
                         :suggested_health, :observed_alive_count, 'pending', :rarity_level)"
                );
                $statement->execute([
                    'report_code' => $reportCode,
                    'user_id' => $userId,
                    'barangay_id' => $barangayId,
                    'cluster_id' => $clusterId,
                    'parent_report_id' => $parentId,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'location_accuracy' => $accuracy,
                    'sitio_name' => $sitio,
                    'photo_path' => $storedPhoto['path'],
                    'photo_original_name' => $storedPhoto['original_name'],
                    'photo_mime' => $storedPhoto['mime'],
                    'photo_sha256' => $storedPhoto['sha256'],
                    'guardian_remarks' => $remarks,
                    'root_type' => $rootType,
                    'leaf_shape' => $leafShape,
                    'bark_texture' => $barkTexture,
                    'suggested_species_id' => $best['id'] ?? null,
                    'species_confidence' => $best['confidence'] ?? null,
                    'health_score' => $classification['health_score'],
                    'health_max_score' => $classification['health_max_score'],
                    'environmental_score' => $classification['environmental_score'],
                    'suggested_health' => $classification['status'],
                    'observed_alive_count' => $aliveCount,
                    'rarity_level' => $rarity,
                ]);
                $reportId = (int) $pdo->lastInsertId();

                $observation = $pdo->prepare(
                    'INSERT INTO report_observations
                        (report_id, criteria_id, option_id, points_snapshot,
                         criteria_code_snapshot, criterion_name_snapshot, score_group_snapshot,
                         selection_mode_snapshot, option_code_snapshot, option_label_snapshot,
                         criteria_order_snapshot, option_order_snapshot)
                     VALUES
                        (:report_id, :criteria_id, :option_id, :points,
                         :criteria_code, :criterion_name, :score_group,
                         :selection_mode, :option_code, :option_label,
                         :criteria_order, :option_order)'
                );
                foreach ($classification['observations'] as $selected) {
                    $observation->execute([
                        'report_id' => $reportId,
                        'criteria_id' => $selected['criteria_id'],
                        'option_id' => $selected['option_id'],
                        'points' => $selected['points'],
                        'criteria_code' => $selected['criteria_code'],
                        'criterion_name' => $selected['criteria_name'],
                        'score_group' => $selected['score_group'],
                        'selection_mode' => $selected['selection_mode'],
                        'option_code' => $selected['option_code'],
                        'option_label' => $selected['option_label'],
                        'criteria_order' => $selected['criteria_order'],
                        'option_order' => $selected['option_order'],
                    ]);
                }

                \Audit::logRequired('report.submitted', 'report', $reportId, [
                    'report_code' => $reportCode,
                    'status' => 'pending',
                ], $userId);

                return [
                    'id' => $reportId,
                    'report_code' => $reportCode,
                    'status' => 'pending',
                    'suggested_health' => $classification['status'],
                    'health_score' => $classification['health_score'],
                    'health_max_score' => 6,
                    'suggested_species' => $best,
                ];
            });
        } catch (\Throwable $exception) {
            $this->uploads->removeStoredPhoto($storedPhoto['absolute_path']);
            throw $exception;
        }

        return $result;
    }

    /** @return array<string,mixed> */
    public function dashboard(array $user): array
    {
        $userId = (int) $user['id'];
        $guardian = ($user['role'] ?? '') === 'guardian';
        $where = $guardian ? ' WHERE r.user_id = :user_id' : '';
        $params = $guardian ? ['user_id' => $userId] : [];

        $statsStatement = $this->pdo->prepare(
            "SELECT COUNT(*) AS total_reports,
                    SUM(r.status = 'pending') AS pending_reports,
                    SUM(r.status = 'verified') AS verified_reports,
                    SUM(r.status = 'rejected') AS rejected_reports,
                    COUNT(DISTINCT CASE WHEN r.status = 'verified' THEN r.cluster_id END) AS clusters_covered,
                    COUNT(DISTINCT CASE WHEN r.status = 'verified' THEN r.final_species_id END) AS species_identified,
                    SUM(r.status = 'verified' AND r.needs_attention = 1) AS needs_attention
             FROM reports r" . $where
        );
        $statsStatement->execute($params);
        $stats = $statsStatement->fetch() ?: [];
        foreach ($stats as $key => $value) {
            $stats[$key] = (int) ($value ?? 0);
        }

        if (!$guardian) {
            $stats['active_guardians'] = (int) $this->pdo->query(
                "SELECT COUNT(*) FROM users WHERE role = 'guardian' AND status = 'active'"
            )->fetchColumn();
        }

        $latestSql =
            "SELECT r.id, r.report_code, r.status, r.suggested_health,
                    COALESCE(r.final_health, r.suggested_health) AS display_health,
                    r.submitted_at, r.needs_attention, c.name AS cluster_name,
                    CASE
                        WHEN r.status = 'verified' THEN fs.scientific_name
                        WHEN r.status = 'pending' THEN ss.scientific_name
                        ELSE NULL
                    END AS species_name,
                    u.full_name AS guardian_name
             FROM reports r
             JOIN users u ON u.id = r.user_id
             LEFT JOIN mangrove_clusters c ON c.id = r.cluster_id
             LEFT JOIN mangrove_species fs ON fs.id = r.final_species_id
             LEFT JOIN mangrove_species ss ON ss.id = r.suggested_species_id" .
             ($guardian ? ' WHERE r.user_id = :user_id' : '') .
             ' ORDER BY r.submitted_at DESC, r.id DESC LIMIT 5';
        $latest = $this->pdo->prepare($latestSql);
        $latest->execute($params);

        $reminders = [];
        if ($guardian) {
            $reminderStatement = $this->pdo->prepare(
                "SELECT r.id, r.report_code, r.cluster_id, r.next_followup_date,
                        c.name AS cluster_name,
                        CASE WHEN r.next_followup_date < CURDATE() THEN 'overdue' ELSE 'due_soon' END AS due_state,
                        DATEDIFF(r.next_followup_date, CURDATE()) AS days_until_due
                 FROM reports r
                 JOIN mangrove_clusters c ON c.id = r.cluster_id
                 WHERE r.user_id = :user_id AND r.status = 'verified'
                   AND r.next_followup_date IS NOT NULL
                   AND r.next_followup_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                   AND NOT EXISTS (
                       SELECT 1 FROM reports child
                       WHERE child.parent_report_id = r.id AND child.status IN ('pending', 'verified')
                   )
                 ORDER BY r.next_followup_date, r.id"
            );
            $reminderStatement->execute(['user_id' => $userId]);
            $reminders = $reminderStatement->fetchAll();

            $createNotification = $this->pdo->prepare(
                'INSERT IGNORE INTO notifications (user_id, type, title, message, link, dedupe_key)
                 VALUES (:user_id, :type, :title, :message, :link, :dedupe_key)'
            );
            foreach ($reminders as $reminder) {
                $overdue = ($reminder['due_state'] ?? '') === 'overdue';
                $type = $overdue ? 'followup_overdue' : 'followup_due';
                $link = 'submit-report.php?parent=' . (int) $reminder['id'];
                $title = $overdue ? 'Follow-up overdue' : 'Follow-up due soon';
                $message = $overdue
                    ? 'The follow-up for ' . $reminder['report_code'] . ' is overdue. Submit an updated observation when it is safe to visit.'
                    : 'The follow-up for ' . $reminder['report_code'] . ' is due within seven days.';
                $createNotification->execute([
                    'user_id' => $userId,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'link' => $link,
                    'dedupe_key' => $type . ':' . (int) $reminder['id'],
                ]);
            }
        }

        return ['stats' => $stats, 'latest_reports' => $latest->fetchAll(), 'reminders' => $reminders];
    }

    /** @return array{items:list<array<string,mixed>>,total:int,page:int,pages:int,per_page:int} */
    public function reportsForUser(array $user, array $filters = [], int $page = 1, int $perPage = 10): array
    {
        $page = max(1, $page);
        $perPage = max(5, min(50, $perPage));
        $conditions = [];
        $params = [];
        if (($user['role'] ?? '') === 'guardian') {
            $conditions[] = 'r.user_id = :viewer_id';
            $params['viewer_id'] = (int) $user['id'];
        }
        $status = is_scalar($filters['status'] ?? null) ? (string) $filters['status'] : '';
        if (in_array($status, ['pending', 'verified', 'rejected'], true)) {
            $conditions[] = 'r.status = :status';
            $params['status'] = $status;
        }
        $health = is_scalar($filters['health'] ?? null) ? (string) $filters['health'] : '';
        if (in_array($health, ['Healthy', 'Stressed', 'At Risk'], true)) {
            $conditions[] = 'COALESCE(r.final_health, r.suggested_health) = :health';
            $params['health'] = $health;
        }
        $search = mb_substr(trim(is_scalar($filters['q'] ?? null) ? (string) $filters['q'] : ''), 0, 100);
        if ($search !== '') {
            $conditions[] = "(r.report_code LIKE :search_code OR r.sitio_name LIKE :search_sitio
                OR c.name LIKE :search_cluster
                OR (r.status = 'verified' AND fs.scientific_name LIKE :search_final_species)
                OR (r.status = 'pending' AND ss.scientific_name LIKE :search_suggested_species)
                OR u.full_name LIKE :search_guardian)";
            foreach (['search_code', 'search_sitio', 'search_cluster', 'search_final_species', 'search_suggested_species', 'search_guardian'] as $placeholder) {
                $params[$placeholder] = '%' . $search . '%';
            }
        }
        $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';
        $joins =
            ' FROM reports r
              JOIN users u ON u.id = r.user_id
              LEFT JOIN mangrove_clusters c ON c.id = r.cluster_id
              LEFT JOIN mangrove_species fs ON fs.id = r.final_species_id
              LEFT JOIN mangrove_species ss ON ss.id = r.suggested_species_id';

        $count = $this->pdo->prepare('SELECT COUNT(*)' . $joins . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $pages = max(1, (int) ceil($total / $perPage));
        $page = min($page, $pages);
        $offset = ($page - 1) * $perPage;

        $items = $this->pdo->prepare(
            "SELECT r.id, r.report_code, r.status, r.submitted_at, r.verified_at,
                    r.next_followup_date, r.needs_attention, r.parent_report_id,
                    COALESCE(r.final_health, r.suggested_health) AS display_health,
                    CASE
                        WHEN r.status = 'verified' THEN fs.scientific_name
                        WHEN r.status = 'pending' THEN ss.scientific_name
                        ELSE NULL
                    END AS species_name,
                    c.name AS cluster_name, r.sitio_name, u.full_name AS guardian_name" .
            $joins . $where .
            " ORDER BY r.submitted_at DESC, r.id DESC LIMIT {$perPage} OFFSET {$offset}"
        );
        $items->execute($params);

        return [
            'items' => $items->fetchAll(),
            'total' => $total,
            'page' => $page,
            'pages' => $pages,
            'per_page' => $perPage,
        ];
    }

    /** @return array<string,mixed>|null */
    public function reportDetail(int $reportId, array $viewer): ?array
    {
        $sql =
            "SELECT r.*, u.full_name AS guardian_name, u.email AS guardian_email,
                    b.name AS barangay_name, c.name AS cluster_name, c.cluster_code,
                    c.center_lat AS cluster_lat, c.center_lng AS cluster_lng,
                    ss.scientific_name AS suggested_species_name,
                    ss.common_name AS suggested_species_common,
                    fs.scientific_name AS final_species_name,
                    fs.common_name AS final_species_common,
                    e.full_name AS expert_name,
                    parent.report_code AS parent_report_code
             FROM reports r
             JOIN users u ON u.id = r.user_id
             JOIN barangays b ON b.id = r.barangay_id
             LEFT JOIN mangrove_clusters c ON c.id = r.cluster_id
             LEFT JOIN mangrove_species ss ON ss.id = r.suggested_species_id
             LEFT JOIN mangrove_species fs ON fs.id = r.final_species_id
             LEFT JOIN users e ON e.id = r.expert_id
             LEFT JOIN reports parent ON parent.id = r.parent_report_id
             WHERE r.id = :id";
        $params = ['id' => $reportId];
        if (($viewer['role'] ?? '') === 'guardian') {
            $sql .= ' AND r.user_id = :viewer_id';
            $params['viewer_id'] = (int) $viewer['id'];
        }
        $sql .= ' LIMIT 1';
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        $report = $statement->fetch();
        if (!$report) {
            return null;
        }

        $observations = $this->pdo->prepare(
            'SELECT COALESCE(ro.criteria_code_snapshot, c.code) AS criteria_code,
                    COALESCE(ro.criterion_name_snapshot, c.name) AS criteria_name,
                    COALESCE(ro.score_group_snapshot, c.score_group) AS score_group,
                    COALESCE(ro.selection_mode_snapshot, c.selection_mode) AS selection_mode,
                    o.id AS option_id,
                    COALESCE(ro.option_label_snapshot, o.label) AS option_label,
                    ro.points_snapshot
             FROM report_observations ro
             LEFT JOIN health_criteria c ON c.id = ro.criteria_id
             LEFT JOIN health_options o ON o.id = ro.option_id
             WHERE ro.report_id = :report_id
             ORDER BY COALESCE(ro.criteria_order_snapshot, c.display_order), ro.criteria_id,
                      COALESCE(ro.option_order_snapshot, o.display_order), ro.option_id'
        );
        $observations->execute(['report_id' => $reportId]);
        $grouped = [];
        foreach ($observations->fetchAll() as $observation) {
            $code = (string) $observation['criteria_code'];
            if (!isset($grouped[$code])) {
                $grouped[$code] = [
                    'name' => (string) $observation['criteria_name'],
                    'score_group' => (string) $observation['score_group'],
                    'options' => [],
                ];
            }
            if ($observation['option_id'] !== null) {
                $grouped[$code]['options'][] = [
                    'label' => (string) $observation['option_label'],
                    'points' => (int) $observation['points_snapshot'],
                ];
            }
        }

        $logs = $this->pdo->prepare(
            'SELECT vl.*, u.full_name AS verifier_name
             FROM verification_logs vl JOIN users u ON u.id = vl.verifier_id
             WHERE vl.report_id = :report_id ORDER BY vl.created_at, vl.id'
        );
        $logs->execute(['report_id' => $reportId]);
        $report['observations'] = array_values($grouped);
        $report['verification_history'] = $logs->fetchAll();
        return $report;
    }

    /** @return list<array<string,mixed>> */
    public function previousReports(int $userId, int $clusterId): array
    {
        $statement = $this->pdo->prepare(
            "SELECT r.id, r.report_code, r.submitted_at, r.verified_at, r.next_followup_date,
                    COALESCE(r.final_health, r.suggested_health) AS health,
                    s.scientific_name AS species_name
             FROM reports r
             LEFT JOIN mangrove_species s ON s.id = r.final_species_id
             WHERE r.user_id = :user_id AND r.cluster_id = :cluster_id AND r.status = 'verified'
               AND NOT EXISTS (
                   SELECT 1 FROM reports child
                   WHERE child.parent_report_id = r.id AND child.status IN ('pending', 'verified')
               )
             ORDER BY r.submitted_at DESC, r.id DESC LIMIT 30"
        );
        $statement->execute(['user_id' => $userId, 'cluster_id' => $clusterId]);
        return $statement->fetchAll();
    }

    /** @return list<array<string,mixed>> */
    public function clustersForMap(array $viewer, array $filters = []): array
    {
        $conditions = [];
        $params = [];
        if (($viewer['role'] ?? '') === 'guardian') {
            if (!empty($viewer['barangay_id'])) {
                $conditions[] = 'c.barangay_id = :barangay_id';
                $params['barangay_id'] = (int) $viewer['barangay_id'];
            } else {
                $conditions[] = '1 = 0';
            }
        }
        $health = is_scalar($filters['health'] ?? null) ? (string) $filters['health'] : '';
        if (in_array($health, ['Healthy', 'Stressed', 'At Risk', 'Unknown'], true)) {
            $conditions[] = 'c.latest_health = :health';
            $params['health'] = $health;
        }
        $speciesId = $this->positiveIntOrNull($filters['species_id'] ?? null);
        if ($speciesId !== null) {
            $conditions[] = '(c.species_id = :species_id OR EXISTS (
                SELECT 1 FROM reports sr WHERE sr.cluster_id = c.id AND sr.status = \'verified\'
                AND sr.final_species_id = :species_report_id
            ))';
            $params['species_id'] = $speciesId;
            $params['species_report_id'] = $speciesId;
        }
        $search = mb_substr(trim(is_scalar($filters['q'] ?? null) ? (string) $filters['q'] : ''), 0, 100);
        if ($search !== '') {
            $conditions[] = '(c.name LIKE :search_name OR c.cluster_code LIKE :search_code OR c.sitio_name LIKE :search_sitio OR b.name LIKE :search_barangay)';
            foreach (['search_name', 'search_code', 'search_sitio', 'search_barangay'] as $placeholder) {
                $params[$placeholder] = '%' . $search . '%';
            }
        }
        $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';

        $statement = $this->pdo->prepare(
            "SELECT c.id, c.cluster_code, c.name, c.sitio_name,
                    CAST(c.center_lat AS DECIMAL(10,8)) AS latitude,
                    CAST(c.center_lng AS DECIMAL(11,8)) AS longitude,
                    c.radius_meters, c.latest_health, c.verified_count, c.latest_report_at,
                    c.initial_seedlings, c.rarity_level, b.name AS barangay_name,
                    s.id AS species_id, s.scientific_name, s.common_name,
                    CASE WHEN c.initial_seedlings > 0 THEN LEAST(100.0, ROUND((
                        SELECT r.observed_alive_count FROM reports r
                        WHERE r.cluster_id = c.id AND r.status = 'verified'
                        ORDER BY r.submitted_at DESC, r.id DESC LIMIT 1
                    ) / c.initial_seedlings * 100, 1)) ELSE NULL END AS latest_survival_percent
             FROM mangrove_clusters c
             JOIN barangays b ON b.id = c.barangay_id
             LEFT JOIN mangrove_species s ON s.id = c.species_id" . $where .
             ' ORDER BY c.name'
        );
        $statement->execute($params);
        return $statement->fetchAll();
    }

    /** @return list<array<string,mixed>> */
    public function speciesSearch(array $viewer, string $query = ''): array
    {
        $conditions = ['s.active = 1'];
        $params = [];
        $query = mb_substr(trim($query), 0, 100);
        if ($query !== '') {
            $conditions[] = '(s.scientific_name LIKE :search_scientific OR s.common_name LIKE :search_common
                OR s.local_name LIKE :search_local OR s.family LIKE :search_family)';
            foreach (['search_scientific', 'search_common', 'search_local', 'search_family'] as $placeholder) {
                $params[$placeholder] = '%' . $query . '%';
            }
        }
        $catalogScope = '';
        if (($viewer['role'] ?? '') === 'guardian') {
            if (!empty($viewer['barangay_id'])) {
                $catalogScope = ' WHERE matched.barangay_id = :barangay_id';
                $params['barangay_id'] = (int) $viewer['barangay_id'];
            } else {
                $catalogScope = ' WHERE 1 = 0';
            }
        }

        $statement = $this->pdo->prepare(
            "SELECT s.id, s.scientific_name, s.common_name, s.local_name, s.family,
                    s.iucn_code, s.iucn_label, s.population_trend,
                    s.root_type, s.leaf_shape, s.bark_texture,
                    COALESCE(sc.cluster_count, 0) AS cluster_count,
                    sc.cluster_names
             FROM mangrove_species s
             LEFT JOIN (
                 SELECT matched.species_id, COUNT(DISTINCT matched.cluster_id) AS cluster_count,
                        GROUP_CONCAT(DISTINCT matched.cluster_name ORDER BY matched.cluster_name SEPARATOR ', ') AS cluster_names
                 FROM (
                     SELECT c.species_id, c.id AS cluster_id, c.name AS cluster_name, c.barangay_id
                     FROM mangrove_clusters c WHERE c.species_id IS NOT NULL
                     UNION ALL
                     SELECT r.final_species_id, c.id AS cluster_id, c.name AS cluster_name, c.barangay_id
                     FROM reports r
                     JOIN mangrove_clusters c ON c.id = r.cluster_id
                     WHERE r.status = 'verified' AND r.final_species_id IS NOT NULL
                 ) matched" . $catalogScope . "
                 GROUP BY matched.species_id
             ) sc ON sc.species_id = s.id" .
             ' WHERE ' . implode(' AND ', $conditions) .
             ' ORDER BY s.scientific_name LIMIT 100'
        );
        $statement->execute($params);
        return $statement->fetchAll();
    }

    /** @return array{cluster:array<string,mixed>,timeline:list<array<string,mixed>>}|null */
    public function clusterTimeline(int $clusterId, array $viewer): ?array
    {
        $clusterSql =
            'SELECT c.*, b.name AS barangay_name, s.scientific_name, s.common_name
             FROM mangrove_clusters c
             JOIN barangays b ON b.id = c.barangay_id
             LEFT JOIN mangrove_species s ON s.id = c.species_id
             WHERE c.id = :id';
        $params = ['id' => $clusterId];
        if (($viewer['role'] ?? '') === 'guardian') {
            if (!empty($viewer['barangay_id'])) {
                $clusterSql .= ' AND c.barangay_id = :barangay_id';
                $params['barangay_id'] = (int) $viewer['barangay_id'];
            } else {
                $clusterSql .= ' AND 1 = 0';
            }
        }
        $clusterSql .= ' LIMIT 1';
        $clusterStatement = $this->pdo->prepare($clusterSql);
        $clusterStatement->execute($params);
        $cluster = $clusterStatement->fetch();
        if (!$cluster) {
            return null;
        }

        $timeline = $this->pdo->prepare(
            "SELECT r.id, r.user_id, r.report_code, r.submitted_at, r.verified_at,
                    r.final_health AS health, r.observed_alive_count, r.needs_attention,
                    r.photo_path, r.expert_feedback, r.latitude, r.longitude,
                    s.scientific_name AS species_name
             FROM reports r
             LEFT JOIN mangrove_species s ON s.id = r.final_species_id
             WHERE r.cluster_id = :cluster_id AND r.status = 'verified'
             ORDER BY COALESCE(r.verified_at, r.submitted_at), r.id"
        );
        $timeline->execute(['cluster_id' => $clusterId]);
        $entries = $timeline->fetchAll();
        if (($viewer['role'] ?? '') === 'guardian') {
            $viewerId = (int) ($viewer['id'] ?? 0);
            foreach ($entries as &$entry) {
                $entry['can_view_details'] = (int) $entry['user_id'] === $viewerId;
                if (!$entry['can_view_details']) {
                    $entry['report_code'] = 'Community observation';
                    $entry['photo_path'] = null;
                    $entry['expert_feedback'] = null;
                    $entry['latitude'] = null;
                    $entry['longitude'] = null;
                }
            }
            unset($entry);
        } else {
            foreach ($entries as &$entry) {
                $entry['can_view_details'] = true;
            }
            unset($entry);
        }
        return ['cluster' => $cluster, 'timeline' => $entries];
    }

    /** @return array<string,mixed> */
    public function healthPreview(array $selections): array
    {
        return $this->classifier->classify($selections);
    }

    /** @return array{best:?array<string,mixed>,ranked:list<array<string,mixed>>} */
    public function speciesMatch(array $traits): array
    {
        return $this->matcher->match($traits);
    }

    private function positiveIntOrNull(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $integer = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($integer === false) {
            throw new InvalidArgumentException('An invalid record was selected.');
        }
        return (int) $integer;
    }

    private function coordinate(mixed $value, float $minimum, float $maximum, string $label): float
    {
        if (!is_scalar($value) || !is_numeric((string) $value)) {
            throw new InvalidArgumentException('A valid ' . $label . ' is required.');
        }
        $coordinate = (float) $value;
        if (!is_finite($coordinate) || $coordinate < $minimum || $coordinate > $maximum) {
            throw new InvalidArgumentException('The ' . $label . ' is outside the valid range.');
        }
        return round($coordinate, 8);
    }

    private static function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;
        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lngDelta / 2) ** 2;
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(max(0.0, 1 - $a)));
    }

    private function cleanText(mixed $value, int $maximum, string $label, bool $allowEmpty = false): ?string
    {
        if (!is_scalar($value)) {
            throw new InvalidArgumentException($label . ' is not valid.');
        }
        $text = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $value) ?? '');
        if ($text === '') {
            if ($allowEmpty) {
                return null;
            }
            throw new InvalidArgumentException($label . ' is required.');
        }
        if (mb_strlen($text) > $maximum) {
            throw new InvalidArgumentException($label . ' must not exceed ' . $maximum . ' characters.');
        }
        return $text;
    }

    private function newReportCode(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $code = 'MGR-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
            $statement = $this->pdo->prepare('SELECT 1 FROM reports WHERE report_code = :code');
            $statement->execute(['code' => $code]);
            if (!$statement->fetchColumn()) {
                return $code;
            }
        }
        throw new RuntimeException('A unique report reference could not be generated. Please submit again.');
    }
}
