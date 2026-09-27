<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';
MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
$clusters = (new App\Services\ReportService(Database::connection()))->clustersForMap($user, $_GET);
foreach ($clusters as &$cluster) {
    if ($user['role'] !== 'system_admin') unset($cluster['latest_survival_percent']);
}
unset($cluster);
json_response(['ok' => true, 'clusters' => $clusters]);
