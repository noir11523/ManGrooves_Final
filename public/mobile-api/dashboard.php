<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\ReportService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
$dashboard = (new ReportService(Database::connection()))->dashboard($user);
json_response([
    'ok' => true,
    'user' => MobileApi::publicUser($user),
    'stats' => $dashboard['stats'],
    'latest_reports' => $dashboard['latest_reports'],
    'reminders' => $dashboard['reminders'],
    'clusters' => array_map(static fn (array $cluster): array => array_intersect_key($cluster, array_flip([
        'id', 'name', 'cluster_code', 'latitude', 'longitude', 'latest_health', 'barangay_name', 'verified_count',
    ])), $dashboard['clusters']),
]);
