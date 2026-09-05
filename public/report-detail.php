<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::requireLogin();
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$report = $id ? (new ReportService(Database::connection()))->reportDetail((int) $id, $user) : null;
if (!$report) {
    http_response_code(404);
    render('report-detail', [
        'pageTitle' => 'Report not found',
        'report' => null,
        'user' => $user,
        'embedded' => false,
    ]);
    exit;
}

render('report-detail', [
    'pageTitle' => 'Report ' . $report['report_code'],
    'report' => $report,
    'user' => $user,
    'embedded' => false,
]);
