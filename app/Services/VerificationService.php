<?php

declare(strict_types=1);

namespace App\Services;

use DomainException;
use InvalidArgumentException;
use PDO;

final class VerificationService
{
    private const HEALTH_VALUES = ['Healthy', 'Stressed', 'At Risk'];
    private const RARITY_VALUES = ['Common', 'Vulnerable', 'Rare', 'Unassigned'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * Review a pending report and atomically persist every related database change.
     *
     * @return array{report_id:int,user_id:int,status:string,cluster_id:?int,new_badges:array}
     */
    public function review(int $reportId, int $verifierId, array $input): array
    {
        if ($reportId < 1 || $verifierId < 1) {
            throw new InvalidArgumentException('A valid report and verifier are required.');
        }

        $action = strtolower(trim(\scalar_string($input['action'] ?? null)));
        if (!in_array($action, ['confirm', 'correct', 'reject'], true)) {
            throw new InvalidArgumentException('Choose Confirm, Correct, or Reject.');
        }

        $comment = trim(\scalar_string($input['expert_feedback'] ?? $input['comment'] ?? null));
        if ($action === 'reject' && $comment === '') {
            throw new InvalidArgumentException('A rejection comment is required so the guardian knows what to improve.');
        }
        if (mb_strlen($comment) > 5000) {
            throw new InvalidArgumentException('Feedback must be 5,000 characters or fewer.');
        }

        $needsAttention = $action === 'reject' ? 0
            : (\scalar_string($input['needs_attention'] ?? null) === '1' ? 1 : 0);
        $requestedHealth = trim(\scalar_string($input['final_health'] ?? null));
        $requestedRarity = trim(\scalar_string($input['rarity_level'] ?? null));
        $rawRequestedSpecies = trim(\scalar_string($input['final_species_id'] ?? null));
        $requestedSpecies = filter_var($rawRequestedSpecies, FILTER_VALIDATE_INT);
        if ($rawRequestedSpecies !== '' && ($requestedSpecies === false || $requestedSpecies < 1)) {
            throw new InvalidArgumentException('Select a valid final species.');
        }

        $result = \Database::transaction(function (PDO $pdo) use (
            $reportId,
            $verifierId,
            $action,
            $comment,
            $needsAttention,
            $requestedHealth,
            $requestedRarity,
            $requestedSpecies
        ): array {
            $verifierStatement = $pdo->prepare(
                "SELECT id FROM users
                 WHERE id = :id AND status = 'active' AND role IN ('expert', 'system_admin')
                 LIMIT 1 FOR UPDATE"
            );
            $verifierStatement->execute(['id' => $verifierId]);
            if (!$verifierStatement->fetchColumn()) {
                throw new DomainException('Only an active expert or system administrator may review reports.');
            }

            $reportStatement = $pdo->prepare('SELECT * FROM reports WHERE id = :id LIMIT 1 FOR UPDATE');
            $reportStatement->execute(['id' => $reportId]);
            $report = $reportStatement->fetch();
            if (!$report) {
                throw new DomainException('The report no longer exists.');
            }
            if ($report['status'] !== 'pending') {
                throw new DomainException('This report has already been reviewed. Refresh the verification queue.');
            }
            if ((int) $report['user_id'] === $verifierId) {
                throw new DomainException('You cannot review your own monitoring report. Ask another expert or administrator to verify it.');
            }
            $ownerLock = $pdo->prepare('SELECT id FROM users WHERE id = :id LIMIT 1 FOR UPDATE');
            $ownerLock->execute(['id' => $report['user_id']]);
            if (!$ownerLock->fetchColumn()) {
                throw new DomainException('The report owner no longer exists.');
            }

            $previousHealth = $report['final_health'] ?: $report['suggested_health'];
            $previousSpeciesId = $report['final_species_id'] ?: $report['suggested_species_id'];
            $newStatus = $action === 'reject' ? 'rejected' : 'verified';
            $clusterId = null;
            $newHealth = null;
            $newSpeciesId = null;
            $newRarity = 'Unassigned';

            if ($action !== 'reject') {
                $newHealth = $action === 'correct' && $requestedHealth !== ''
                    ? $requestedHealth
                    : (string) $report['suggested_health'];
                if (!in_array($newHealth, self::HEALTH_VALUES, true)) {
                    throw new InvalidArgumentException('Select a valid final health classification.');
                }

                if ($action === 'correct') {
                    $newSpeciesId = $requestedSpecies ?: null;
                    $newRarity = $requestedRarity !== '' ? $requestedRarity : (string) $report['rarity_level'];
                } else {
                    $newSpeciesId = $report['suggested_species_id'] === null ? null : (int) $report['suggested_species_id'];
                    $newRarity = (string) $report['rarity_level'];
                }

                if (!in_array($newRarity, self::RARITY_VALUES, true)) {
                    throw new InvalidArgumentException('Select a valid rarity level.');
                }
                if ($newSpeciesId !== null) {
                    $speciesStatement = $pdo->prepare('SELECT id FROM mangrove_species WHERE id = :id AND active = 1 LIMIT 1');
                    $speciesStatement->execute(['id' => $newSpeciesId]);
                    if (!$speciesStatement->fetchColumn()) {
                        throw new InvalidArgumentException('The selected species is not available.');
                    }
                }

                $clusterId = $this->assignCluster($pdo, $report, $newSpeciesId, $newRarity);
            }

            $update = $pdo->prepare(
                "UPDATE reports SET
                    cluster_id = :cluster_id,
                    final_species_id = :species_id,
                    final_health = :health,
                    rarity_level = :rarity,
                    status = :status,
                    needs_attention = :needs_attention,
                    expert_id = :expert_id,
                    expert_feedback = :feedback,
                    verified_at = NOW(),
                    next_followup_date = CASE WHEN :verified_flag = 1 THEN DATE_ADD(CURDATE(), INTERVAL 30 DAY) ELSE NULL END
                 WHERE id = :id AND status = 'pending'"
            );
            $update->execute([
                'cluster_id' => $clusterId,
                'species_id' => $newSpeciesId,
                'health' => $newHealth,
                'rarity' => $action === 'reject' ? (string) $report['rarity_level'] : $newRarity,
                'status' => $newStatus,
                'needs_attention' => $needsAttention,
                'expert_id' => $verifierId,
                'feedback' => $comment === '' ? null : $comment,
                'verified_flag' => $newStatus === 'verified' ? 1 : 0,
                'id' => $reportId,
            ]);
            if ($update->rowCount() !== 1) {
                throw new DomainException('The report changed while it was being reviewed. Please refresh and try again.');
            }

            if ($clusterId !== null) {
                $this->refreshCluster($pdo, $clusterId);
            }

            $log = $pdo->prepare(
                'INSERT INTO verification_logs
                    (report_id, verifier_id, action, previous_status, new_status, previous_health, new_health,
                     previous_species_id, new_species_id, comment)
                 VALUES
                    (:report_id, :verifier_id, :action, :previous_status, :new_status, :previous_health, :new_health,
                     :previous_species_id, :new_species_id, :comment)'
            );
            $log->execute([
                'report_id' => $reportId,
                'verifier_id' => $verifierId,
                'action' => $action,
                'previous_status' => (string) $report['status'],
                'new_status' => $newStatus,
                'previous_health' => $previousHealth ?: null,
                'new_health' => $newHealth,
                'previous_species_id' => $previousSpeciesId ?: null,
                'new_species_id' => $newSpeciesId,
                'comment' => $comment === '' ? null : $comment,
            ]);

            $title = $newStatus === 'verified' ? 'Report verified' : 'Report needs revision';
            $message = $newStatus === 'verified'
                ? 'Your report ' . $report['report_code'] . ' was verified. A follow-up is due in 30 days.'
                : 'Your report ' . $report['report_code'] . ' was rejected. Review the expert feedback before submitting again.';
            $notification = $pdo->prepare(
                'INSERT INTO notifications (user_id, type, title, message, link)
                 VALUES (:user_id, :type, :title, :message, :link)'
            );
            $notification->execute([
                'user_id' => $report['user_id'],
                'type' => 'report_' . $newStatus,
                'title' => $title,
                'message' => $message,
                'link' => 'reports.php?id=' . $reportId,
            ]);

            if ($newStatus === 'verified' && $needsAttention === 1) {
                $notification->execute([
                    'user_id' => $report['user_id'],
                    'type' => 'needs_attention',
                    'title' => 'Site marked for attention',
                    'message' => 'Your verified report ' . $report['report_code'] . ' was marked for attention. Review the expert guidance and plan a prompt follow-up.',
                    'link' => 'reports.php?id=' . $reportId,
                ]);
            }

            $newBadges = $newStatus === 'verified'
                ? (new BadgeEngine($pdo))->evaluateForUser((int) $report['user_id'])
                : [];

            \Audit::logRequired('report.' . $action, 'report', $reportId, [
                'new_status' => $newStatus,
                'cluster_id' => $clusterId,
                'needs_attention' => $needsAttention === 1,
            ], $verifierId);

            return [
                'report_id' => $reportId,
                'user_id' => (int) $report['user_id'],
                'status' => $newStatus,
                'cluster_id' => $clusterId,
                'new_badges' => $newBadges,
            ];
        });

        return $result;
    }

    /** @return int The assigned cluster ID. */
    private function assignCluster(PDO $pdo, array $report, ?int $speciesId, string $rarity): int
    {
        // Lock every candidate in the barangay. This also serializes concurrent nearby assignments.
        $candidateStatement = $pdo->prepare(
            'SELECT id, center_lat, center_lng, radius_meters
             FROM mangrove_clusters WHERE barangay_id = :barangay_id ORDER BY id FOR UPDATE'
        );
        $candidateStatement->execute(['barangay_id' => $report['barangay_id']]);

        $nearestId = null;
        $nearestDistance = INF;
        $existingClusterId = $report['cluster_id'] === null ? null : (int) $report['cluster_id'];
        $existingClusterFound = false;
        $existingClusterWithinRange = false;
        foreach ($candidateStatement->fetchAll() as $candidate) {
            $distance = self::distanceMeters(
                (float) $report['latitude'],
                (float) $report['longitude'],
                (float) $candidate['center_lat'],
                (float) $candidate['center_lng']
            );
            $threshold = max(10, (int) $candidate['radius_meters']);
            if ($existingClusterId !== null && (int) $candidate['id'] === $existingClusterId) {
                $existingClusterFound = true;
                $existingClusterWithinRange = $distance <= $threshold;
            }
            if ($distance <= $threshold && $distance < $nearestDistance) {
                $nearestId = (int) $candidate['id'];
                $nearestDistance = $distance;
            }
        }

        // A parent-linked follow-up belongs to its established timeline even if its GPS accuracy
        // puts the new point just beyond the automatic radius.
        if ($report['parent_report_id'] !== null && $existingClusterFound) {
            return $existingClusterId;
        }

        // Honor a guardian's explicit map selection when it is geographically plausible.
        if ($existingClusterWithinRange) {
            return $existingClusterId;
        }

        if ($nearestId !== null) {
            return $nearestId;
        }

        $radius = max(10, (int) \config('cluster_radius_meters', 75));
        $code = sprintf('CL-B%d-R%d', (int) $report['barangay_id'], (int) $report['id']);
        $sitio = trim((string) ($report['sitio_name'] ?? ''));
        $name = $sitio !== '' ? 'Mangrove cluster - ' . $sitio : 'Mangrove cluster ' . $report['report_code'];
        $initialSeedlings = $report['observed_alive_count'] === null ? 0 : max(0, (int) $report['observed_alive_count']);
        if ($initialSeedlings < 1) {
            throw new InvalidArgumentException(
                'A positive observed-alive count is required before this report can establish a new monitoring site.'
            );
        }

        $insert = $pdo->prepare(
            'INSERT INTO mangrove_clusters
                (cluster_code, barangay_id, name, sitio_name, center_lat, center_lng, radius_meters,
                 species_id, rarity_level, initial_seedlings, latest_health, verified_count, latest_report_at)
             VALUES
                (:code, :barangay_id, :name, :sitio_name, :lat, :lng, :radius,
                 :species_id, :rarity, :initial_seedlings, :health, 0, NULL)'
        );
        $insert->execute([
            'code' => $code,
            'barangay_id' => $report['barangay_id'],
            'name' => mb_substr($name, 0, 160),
            'sitio_name' => $sitio === '' ? null : mb_substr($sitio, 0, 120),
            'lat' => $report['latitude'],
            'lng' => $report['longitude'],
            'radius' => $radius,
            'species_id' => $speciesId,
            'rarity' => $rarity,
            'initial_seedlings' => $initialSeedlings,
            'health' => $report['suggested_health'],
        ]);

        return (int) $pdo->lastInsertId();
    }

    private function refreshCluster(PDO $pdo, int $clusterId): void
    {
        $latestStatement = $pdo->prepare(
            "SELECT final_health, final_species_id, rarity_level, submitted_at
             FROM reports
             WHERE cluster_id = :cluster_id AND status = 'verified'
             ORDER BY submitted_at DESC, id DESC LIMIT 1 FOR UPDATE"
        );
        $latestStatement->execute(['cluster_id' => $clusterId]);
        $latest = $latestStatement->fetch();
        if (!$latest) {
            return;
        }

        $update = $pdo->prepare(
            "UPDATE mangrove_clusters SET
                latest_health = :health,
                species_id = COALESCE(:species_id, species_id),
                rarity_level = :rarity,
                latest_report_at = :latest_report_at,
                verified_count = (SELECT COUNT(*) FROM reports r WHERE r.cluster_id = :count_cluster_id AND r.status = 'verified')
             WHERE id = :id"
        );
        $update->execute([
            'health' => $latest['final_health'],
            'species_id' => $latest['final_species_id'],
            'rarity' => $latest['rarity_level'],
            'latest_report_at' => $latest['submitted_at'],
            'count_cluster_id' => $clusterId,
            'id' => $clusterId,
        ]);
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
}
