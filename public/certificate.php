<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\BadgeEngine;

$viewer = Auth::requireLogin();
$targetId = (int) $viewer['id'];
if ($viewer['role'] === 'system_admin') {
    $requested = filter_input(INPUT_GET, 'user', FILTER_VALIDATE_INT);
    if ($requested) {
        $targetId = (int) $requested;
    }
}

$statement = Database::connection()->prepare(
    "SELECT u.id, u.full_name, u.created_at, b.name AS barangay_name
     FROM users u LEFT JOIN barangays b ON b.id = u.barangay_id
     WHERE u.id = :id AND u.role = 'guardian' LIMIT 1"
);
$statement->execute(['id' => $targetId]);
$guardian = $statement->fetch();
if (!$guardian || ($viewer['role'] !== 'system_admin' && $targetId !== (int) $viewer['id'])) {
    http_response_code(404);
    render('errors/404', ['pageTitle' => 'Guardian not found']);
    exit;
}
$engine = new BadgeEngine(Database::connection());
$engine->evaluateForUser($targetId);
$badges = array_values(array_filter(
    $engine->progressForUser($targetId),
    static fn (array $badge): bool => (bool) $badge['earned']
));
if ($badges === []) {
    http_response_code(403);
    render('errors/certificate-unavailable', [
        'pageTitle' => 'Certificate not yet available',
        'viewer' => $viewer,
    ]);
    exit;
}
$metrics = $engine->metricsForUser($targetId);

render('certificate', [
    'pageTitle' => 'Guardian certificate',
    'viewer' => $viewer,
    'guardian' => $guardian,
    'badges' => $badges,
    'metrics' => $metrics,
]);
