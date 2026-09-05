<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\AnalyticsService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
if (!in_array($user['role'] ?? '', ['expert', 'system_admin'], true)) {
    json_response(['ok' => false, 'message' => 'Expert or administrator access is required.'], 403);
}

$analytics = (new AnalyticsService(Database::connection()))->dashboard($_GET);
$canViewSurvival = ($user['role'] ?? '') === 'system_admin';
$analytics['capabilities'] = [
    'can_view_survival' => $canViewSurvival,
    'can_export_pdf' => false,
];
if (!$canViewSurvival) {
    unset($analytics['overall_survival'], $analytics['survival_eligible_clusters']);
    foreach ($analytics['growth'] as &$point) {
        unset($point['survival_rate']);
    }
    unset($point);
    foreach ($analytics['clusters'] as &$cluster) {
        unset($cluster['initial_seedlings'], $cluster['observed_alive_count'], $cluster['survival_rate']);
    }
    unset($cluster);
    foreach ($analytics['map'] as &$marker) {
        unset($marker['survival']);
    }
    unset($marker);
}
json_response(['ok' => true, 'analytics' => $analytics]);
