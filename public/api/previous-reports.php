<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::user();
if (!$user) {
    json_response(['ok' => false, 'message' => 'Authentication required.'], 401);
}
if ($user['role'] !== 'guardian') {
    json_response(['ok' => false, 'message' => 'Only guardians can load follow-up reports.'], 403);
}
header('Cache-Control: private, no-store');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
}
$clusterId = filter_input(INPUT_GET, 'cluster_id', FILTER_VALIDATE_INT);
if (!$clusterId) {
    json_response(['ok' => false, 'message' => 'Select a valid cluster.'], 422);
}
try {
    $reports = (new ReportService(Database::connection()))->previousReports((int) $user['id'], (int) $clusterId);
    json_response(['ok' => true, 'reports' => $reports]);
} catch (Throwable $exception) {
    error_log((string) $exception);
    json_response(['ok' => false, 'message' => 'Follow-up history is temporarily unavailable.'], 500);
}
