<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';
MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
if (($user['role'] ?? '') !== 'system_admin') {
    json_response(['ok' => false, 'message' => 'System administrator access is required.'], 403);
}
\App\Services\AnalyticsPdf::download(Database::connection(), $_GET);
