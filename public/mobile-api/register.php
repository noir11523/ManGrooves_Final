<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('POST');
$data = MobileApi::input();
$data['privacy_consent'] = !empty($data['privacy_consent']) ? '1' : '';
[$registered, $errors] = Auth::registerGuardian($data);
if (!$registered) {
    json_response([
        'ok' => false,
        'message' => $errors[0] ?? 'Registration failed.',
        'errors' => array_values($errors),
    ], 422);
}

$user = Auth::user();
if (!$user) {
    json_response(['ok' => false, 'message' => 'Unable to start the mobile session.'], 500);
}
$token = MobileApi::issueToken($user, scalar_string($data['device_name'] ?? null, 'Flutter mobile app'));
$publicUser = MobileApi::publicUser($user);
Auth::logout(false);

json_response(['ok' => true, 'token' => $token, 'user' => $publicUser], 201);
