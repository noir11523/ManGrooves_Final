<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/app/bootstrap.php';
$user = Auth::requireLogin();
$filters = [];
foreach (['q', 'health', 'status'] as $key) $filters[$key] = mb_substr(scalar_string($_GET[$key] ?? null), 0, 100);
$results = (new App\Services\ReportService(Database::connection()))->reportsForUser($user, $filters, filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT) ?: 1, 20);
render('report-map', ['pageTitle' => 'Report map', 'results' => $results, 'filters' => $filters]);
