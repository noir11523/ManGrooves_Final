<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\ReportService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
if (!in_array($user['role'] ?? '', ['expert', 'system_admin'], true)) {
    json_response(['ok' => false, 'message' => 'Expert or administrator access is required.'], 403);
}

$pdo = Database::connection();
$queue = (new ReportService($pdo))->reportsForUser($user, ['status' => 'pending'], 1, 50);
$summary = $pdo->query(
    "SELECT SUM(status = 'pending') AS pending,
            SUM(status = 'verified') AS verified,
            SUM(status = 'rejected') AS rejected,
            SUM(status = 'verified' AND needs_attention = 1) AS verified_attention
     FROM reports"
)->fetch() ?: [];
foreach ($summary as $key => $value) {
    $summary[$key] = (int) ($value ?? 0);
}
$species = $pdo->query(
    'SELECT id, common_name, scientific_name, iucn_code
     FROM mangrove_species WHERE active = 1 ORDER BY common_name, scientific_name'
)->fetchAll();
foreach ($species as &$item) {
    $item['id'] = (int) $item['id'];
}
unset($item);

json_response([
    'ok' => true,
    'items' => $queue['items'],
    'total' => $queue['total'],
    'summary' => $summary,
    'species' => $species,
]);
