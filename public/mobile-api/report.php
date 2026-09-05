<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\ReportService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
$report = $id ? (new ReportService(Database::connection()))->reportDetail((int) $id, $user) : null;
if (!$report) {
    json_response(['ok' => false, 'message' => 'Report not found.'], 404);
}
$report['photo_url'] = 'photo.php?id=' . (int) $report['id'];
unset($report['photo_path'], $report['photo_sha256'], $report['photo_original_name'], $report['guardian_email']);
json_response(['ok' => true, 'report' => $report]);
