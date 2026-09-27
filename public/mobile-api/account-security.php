<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';
MobileApi::requireMethod('POST');
$user = MobileApi::requireUser();
$input = MobileApi::input();
try {
    \App\Services\AccountSecurity::update($user, $input);
    json_response(['ok' => true, 'message' => 'Password changed. Sign in again.']);
} catch (InvalidArgumentException $error) {
    json_response(['ok' => false, 'message' => $error->getMessage()], 422);
}
