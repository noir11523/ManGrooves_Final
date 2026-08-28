<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

$user = Auth::requireRoles('expert', 'system_admin');
$pdo = Database::connection();

$viewMode = scalar_string($_GET['view'] ?? null, 'queue');
$viewMode = in_array($viewMode, ['queue', 'history'], true) ? $viewMode : 'queue';
$status = scalar_string($_GET['status'] ?? null);
$allowedStatuses = $viewMode === 'queue' ? ['pending'] : ['verified', 'rejected'];
if (!in_array($status, $allowedStatuses, true)) {
    $status = $viewMode === 'queue' ? 'pending' : '';
}
$search = mb_substr(trim(scalar_string($_GET['q'] ?? null)), 0, 100);
$rawDateFrom = scalar_string($_GET['date_from'] ?? null);
$rawDateTo = scalar_string($_GET['date_to'] ?? null);
$dateFrom = preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDateFrom) ? $rawDateFrom : '';
$dateTo = preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDateTo) ? $rawDateTo : '';
$page = max(1, (int) scalar_string($_GET['page'] ?? null, '1'));
$perPage = 25;
$offset = ($page - 1) * $perPage;

$clauses = [];
$params = [];
if ($viewMode === 'queue') {
    $clauses[] = "r.status = 'pending'";
} elseif ($status !== '') {
    $clauses[] = 'r.status = :status';
    $params['status'] = $status;
} else {
    $clauses[] = "r.status IN ('verified', 'rejected')";
}
if ($search !== '') {
    $clauses[] = '(r.report_code LIKE :search_code OR u.full_name LIKE :search_user OR b.name LIKE :search_barangay)';
    $like = '%' . $search . '%';
    $params['search_code'] = $like;
    $params['search_user'] = $like;
    $params['search_barangay'] = $like;
}
if ($dateFrom !== '') {
    $clauses[] = 'r.submitted_at >= :date_from';
    $params['date_from'] = $dateFrom;
}
if ($dateTo !== '') {
    $clauses[] = 'r.submitted_at < DATE_ADD(:date_to, INTERVAL 1 DAY)';
    $params['date_to'] = $dateTo;
}
$where = implode(' AND ', $clauses);

$count = $pdo->prepare("SELECT COUNT(*) FROM reports r JOIN users u ON u.id = r.user_id JOIN barangays b ON b.id = r.barangay_id WHERE {$where}");
$count->execute($params);
$total = (int) $count->fetchColumn();

$list = $pdo->prepare(
    "SELECT r.id, r.report_code, r.photo_path, r.suggested_health, r.final_health, r.status,
            r.needs_attention, r.health_score, r.health_max_score, r.submitted_at, r.verified_at,
            u.full_name AS guardian_name, b.name AS barangay_name,
            ss.common_name AS suggested_species, fs.common_name AS final_species,
            e.full_name AS expert_name
     FROM reports r
     JOIN users u ON u.id = r.user_id
     JOIN barangays b ON b.id = r.barangay_id
     LEFT JOIN mangrove_species ss ON ss.id = r.suggested_species_id
     LEFT JOIN mangrove_species fs ON fs.id = r.final_species_id
     LEFT JOIN users e ON e.id = r.expert_id
     WHERE {$where}
     ORDER BY " . ($viewMode === 'queue' ? 'r.needs_attention DESC, r.submitted_at ASC' : 'r.verified_at DESC, r.id DESC') . "
     LIMIT :limit OFFSET :offset"
);
foreach ($params as $key => $value) {
    $list->bindValue(':' . $key, $value);
}
$list->bindValue(':limit', $perPage, PDO::PARAM_INT);
$list->bindValue(':offset', $offset, PDO::PARAM_INT);
$list->execute();
$reports = $list->fetchAll();

$summary = $pdo->query(
    "SELECT SUM(status = 'pending') AS pending,
            SUM(status = 'verified') AS verified,
            SUM(status = 'rejected') AS rejected,
            SUM(status = 'verified' AND needs_attention = 1) AS verified_attention
     FROM reports"
)->fetch() ?: [];

render('admin/verification', [
    'pageTitle' => $viewMode === 'queue' ? 'Verification queue' : 'Verification history',
    'currentUser' => $user,
    'reports' => $reports,
    'summary' => $summary,
    'viewMode' => $viewMode,
    'statusFilter' => $status,
    'search' => $search,
    'dateFrom' => $dateFrom,
    'dateTo' => $dateTo,
    'page' => $page,
    'totalPages' => max(1, (int) ceil($total / $perPage)),
    'total' => $total,
]);
