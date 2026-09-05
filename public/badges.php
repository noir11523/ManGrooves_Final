<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\BadgeEngine;

$user = Auth::requireRoles('guardian');
$engine = new BadgeEngine(Database::connection());
$engine->evaluateForUser((int) $user['id']);
$badges = $engine->progressForUser((int) $user['id']);
$metrics = $engine->metricsForUser((int) $user['id']);

render('badges', [
    'pageTitle' => 'My badges',
    'user' => $user,
    'badges' => $badges,
    'metrics' => $metrics,
]);
