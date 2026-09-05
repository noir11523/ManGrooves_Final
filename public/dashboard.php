<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::requireLogin();
$service = new ReportService(Database::connection());
$dashboard = $service->dashboard($user);

render('dashboard', [
    'pageTitle' => 'Dashboard',
    'user' => $user,
    'stats' => $dashboard['stats'],
    'latestReports' => $dashboard['latest_reports'],
    'reminders' => $dashboard['reminders'],
]);
