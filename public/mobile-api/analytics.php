<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\AnalyticsService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
$analytics = (new AnalyticsService(Database::connection()))->forUser($user, $_GET);
json_response(['ok' => true, 'analytics' => $analytics]);
