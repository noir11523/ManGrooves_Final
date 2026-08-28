<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

use App\Services\AnalyticsService;

$user = Auth::requireRoles('expert', 'system_admin');
$pdo = Database::connection();
$service = new AnalyticsService($pdo);
$analytics = $service->dashboard($_GET);

$barangays = $pdo->query('SELECT id, name FROM barangays ORDER BY name')->fetchAll();
$species = $pdo->query('SELECT id, common_name, scientific_name FROM mangrove_species WHERE active = 1 ORDER BY common_name, scientific_name')->fetchAll();

render('admin/analytics', [
    'pageTitle' => 'Conservation analytics',
    'currentUser' => $user,
    'analytics' => $analytics,
    'barangays' => $barangays,
    'species' => $species,
]);
