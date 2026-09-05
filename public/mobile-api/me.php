<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
json_response(['ok' => true, 'user' => MobileApi::publicUser($user)]);
