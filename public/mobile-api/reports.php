<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\ReportService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
$filters = [
    'status' => scalar_string($_GET['status'] ?? null),
    'health' => scalar_string($_GET['health'] ?? null),
    'q' => mb_substr(trim(scalar_string($_GET['q'] ?? null)), 0, 100),
];
$page = max(1, (int) filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT));
$results = (new ReportService(Database::connection()))->reportsForUser($user, $filters, $page, 20);
json_response(['ok' => true] + $results);
