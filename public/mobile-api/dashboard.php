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
]);
