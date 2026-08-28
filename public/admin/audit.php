<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

$currentUser = Auth::requireRoles('system_admin');
$pdo = Database::connection();
$search = mb_substr(trim(scalar_string($_GET['q'] ?? null)), 0, 100);
$actionFilter = mb_substr(trim(scalar_string($_GET['action'] ?? null)), 0, 100);
$entityFilter = mb_substr(trim(scalar_string($_GET['entity_type'] ?? null)), 0, 60);
$userFilter = filter_var($_GET['user_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
$rawDateFrom = scalar_string($_GET['date_from'] ?? null);
$rawDateTo = scalar_string($_GET['date_to'] ?? null);
$dateFrom = preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDateFrom) ? $rawDateFrom : '';
$dateTo = preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDateTo) ? $rawDateTo : '';
$page = max(1, (int) scalar_string($_GET['page'] ?? null, '1'));
$perPage = 50;
$offset = ($page - 1) * $perPage;
$clauses = ['1 = 1'];
$params = [];
if ($search !== '') {
    $clauses[] = '(a.action LIKE :search_action OR a.entity_id LIKE :search_entity_id OR a.details_json LIKE :search_details OR u.full_name LIKE :search_user)';
    $like = '%' . $search . '%';
    $params['search_action'] = $like;
    $params['search_entity_id'] = $like;
    $params['search_details'] = $like;
    $params['search_user'] = $like;
}
if ($actionFilter !== '') {
    $clauses[] = 'a.action = :action';
    $params['action'] = $actionFilter;
}
if ($entityFilter !== '') {
    $clauses[] = 'a.entity_type = :entity_type';
    $params['entity_type'] = $entityFilter;
}
if ($userFilter) {
    $clauses[] = 'a.user_id = :user_id';
    $params['user_id'] = $userFilter;
}
if ($dateFrom !== '') {
    $clauses[] = 'a.created_at >= :date_from';
    $params['date_from'] = $dateFrom;
}
if ($dateTo !== '') {
    $clauses[] = 'a.created_at < DATE_ADD(:date_to, INTERVAL 1 DAY)';
    $params['date_to'] = $dateTo;
}
$where = implode(' AND ', $clauses);
$count = $pdo->prepare("SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE {$where}");
$count->execute($params);
$total = (int) $count->fetchColumn();
$statement = $pdo->prepare(
    "SELECT a.*, u.full_name AS user_name, u.email AS user_email
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     WHERE {$where} ORDER BY a.created_at DESC, a.id DESC LIMIT :limit OFFSET :offset"
);
foreach ($params as $key => $value) {
    $statement->bindValue(':' . $key, $value);
}
$statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
$statement->bindValue(':offset', $offset, PDO::PARAM_INT);
$statement->execute();

$actions = $pdo->query('SELECT DISTINCT action FROM audit_logs ORDER BY action')->fetchAll(PDO::FETCH_COLUMN);
$entities = $pdo->query('SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type')->fetchAll(PDO::FETCH_COLUMN);
$actors = $pdo->query('SELECT id, full_name, email FROM users ORDER BY full_name')->fetchAll();

render('admin/audit', [
    'pageTitle' => 'Audit log',
    'currentUser' => $currentUser,
    'logs' => $statement->fetchAll(),
    'actions' => $actions,
    'entities' => $entities,
    'actors' => $actors,
    'search' => $search,
    'actionFilter' => $actionFilter,
    'entityFilter' => $entityFilter,
    'userFilter' => $userFilter,
    'dateFrom' => $dateFrom,
    'dateTo' => $dateTo,
    'page' => $page,
    'totalPages' => max(1, (int) ceil($total / $perPage)),
    'total' => $total,
]);
