<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

$stats = [
    'verified_reports' => 0,
    'clusters' => 0,
    'species' => 0,
    'guardians' => 0,
];
$barangays = [];

try {
    $pdo = Database::connection();
    $stats['verified_reports'] = (int) $pdo->query("SELECT COUNT(*) FROM reports WHERE status = 'verified'")->fetchColumn();
    $stats['clusters'] = (int) $pdo->query('SELECT COUNT(*) FROM mangrove_clusters')->fetchColumn();
    $stats['species'] = (int) $pdo->query('SELECT COUNT(*) FROM mangrove_species WHERE active = 1')->fetchColumn();
    $stats['guardians'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'guardian' AND status = 'active'")->fetchColumn();
    $barangays = $pdo->query('SELECT id, name, city_municipality FROM barangays ORDER BY name')->fetchAll();
} catch (Throwable $exception) {
    if (config('debug')) {
        error_log('Landing page data unavailable: ' . $exception->getMessage());
    }
}

render('home', [
    'pageTitle' => 'Community Mangrove Monitoring',
    'pageDescription' => 'Join ManGROOVES to document, monitor, and protect mangrove forests with your community and local environmental experts.',
    'layout' => 'public',
    'bodyClass' => 'home-page',
    'stats' => $stats,
    'barangays' => $barangays,
    'authUser' => Auth::user(),
]);
