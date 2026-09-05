<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('POST');
MobileApi::requireUser();
MobileApi::revokeCurrent();
json_response(['ok' => true, 'message' => 'Signed out.']);
