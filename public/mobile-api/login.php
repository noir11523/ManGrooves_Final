<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('POST');
$data = MobileApi::input();
$email = strtolower(trim(scalar_string($data['email'] ?? null)));
$password = scalar_string($data['password'] ?? null);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190
    || $password === '' || strlen($password) > 72) {
    json_response(['ok' => false, 'message' => 'Enter a valid email address and password.'], 422);
}

[$authenticated, $message] = Auth::attempt($email, $password);
if (!$authenticated) {
    json_response(['ok' => false, 'message' => (string) $message], 401);
}

$user = Auth::user();
if (!$user) {
    json_response(['ok' => false, 'message' => 'Unable to start the mobile session.'], 500);
}
$token = MobileApi::issueToken($user, scalar_string($data['device_name'] ?? null, 'Flutter mobile app'));
$publicUser = MobileApi::publicUser($user);
Auth::logout(false);

json_response(['ok' => true, 'token' => $token, 'user' => $publicUser]);
