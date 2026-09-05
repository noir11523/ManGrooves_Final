<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\BadgeEngine;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
if (($user['role'] ?? '') !== 'guardian') {
    json_response(['ok' => false, 'message' => 'Badges are available to guardian accounts.'], 403);
}

$engine = new BadgeEngine(Database::connection());
$engine->evaluateForUser((int) $user['id']);
$badges = $engine->progressForUser((int) $user['id']);
foreach ($badges as &$badge) {
    $badge['id'] = (int) $badge['id'];
    $badge['target_value'] = (int) $badge['target_value'];
    $badge['current_value'] = (int) $badge['current_value'];
    $badge['progress_percent'] = (float) $badge['progress_percent'];
    $badge['earned'] = (bool) $badge['earned'];
}
unset($badge);

json_response([
    'ok' => true,
    'metrics' => $engine->metricsForUser((int) $user['id']),
    'badges' => $badges,
]);
