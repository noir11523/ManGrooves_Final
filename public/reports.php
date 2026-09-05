<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::requireLogin();
$service = new ReportService(Database::connection());
$filters = [
    'status' => is_string($_GET['status'] ?? null) ? (string) $_GET['status'] : '',
    'health' => is_string($_GET['health'] ?? null) ? (string) $_GET['health'] : '',
    'q' => mb_substr(trim(is_string($_GET['q'] ?? null) ? (string) $_GET['q'] : ''), 0, 100),
];
$page = max(1, (int) (filter_input(INPUT_GET, 'page', FILTER_VALIDATE_INT) ?: 1));
$results = $service->reportsForUser($user, $filters, $page);
$openReportId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) ?: null;

render('reports', [
    'pageTitle' => $user['role'] === 'guardian' ? 'My reports' : 'Reports',
    'user' => $user,
    'filters' => $filters,
    'results' => $results,
    'openReportId' => $openReportId,
]);
