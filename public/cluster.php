<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::requireLogin();
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$data = $id ? (new ReportService(Database::connection()))->clusterTimeline((int) $id, $user) : null;
if (!$data) {
    http_response_code(404);
}

render('cluster-timeline', [
    'pageTitle' => $data ? (string) $data['cluster']['name'] : 'Cluster not found',
    'user' => $user,
    'cluster' => $data['cluster'] ?? null,
    'timeline' => $data['timeline'] ?? [],
]);
