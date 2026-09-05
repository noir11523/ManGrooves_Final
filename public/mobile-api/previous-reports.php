<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\ReportService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
if (($user['role'] ?? '') !== 'guardian') {
    json_response(['ok' => false, 'message' => 'Only guardians can load follow-up reports.'], 403);
}

$clusterId = filter_var($_GET['cluster_id'] ?? null, FILTER_VALIDATE_INT);
if (!$clusterId || $clusterId < 1) {
    json_response(['ok' => false, 'message' => 'Select a valid cluster.'], 422);
}

$reports = (new ReportService(Database::connection()))->previousReports(
    (int) $user['id'],
    (int) $clusterId
);
foreach ($reports as &$report) {
    $report['id'] = (int) $report['id'];
}
unset($report);

json_response(['ok' => true, 'reports' => $reports]);
