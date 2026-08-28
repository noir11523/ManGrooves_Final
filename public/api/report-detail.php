<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::user();
if (!$user) {
    json_response(['ok' => false, 'message' => 'Authentication required.'], 401);
}
header('Cache-Control: private, no-store');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
}
try {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    $report = $id ? (new ReportService(Database::connection()))->reportDetail((int) $id, $user) : null;
    if (!$report) {
        json_response(['ok' => false, 'message' => 'Report not found.'], 404);
    }

    $embedded = true;
    ob_start();
    require APP_ROOT . '/app/Views/report-detail.php';
    $html = (string) ob_get_clean();
    $report['photo_url'] = report_photo_url((int) $report['id']);
    unset($report['photo_path'], $report['photo_sha256'], $report['photo_original_name']);
    json_response(['ok' => true, 'report' => $report, 'html' => $html]);
} catch (Throwable $exception) {
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    error_log((string) $exception);
    json_response(['ok' => false, 'message' => 'Report details are temporarily unavailable.'], 500);
}
