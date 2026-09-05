<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('GET', 'POST');
$user = MobileApi::requireUser();
$pdo = Database::connection();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $input = MobileApi::input();
    $fullName = trim(scalar_string($input['full_name'] ?? null));
    $email = strtolower(trim(scalar_string($input['email'] ?? null)));
    $phone = trim(scalar_string($input['phone'] ?? null));
    $rawBarangay = trim(scalar_string($input['barangay_id'] ?? null));
    $barangayId = $rawBarangay === '' ? null : filter_var($rawBarangay, FILTER_VALIDATE_INT);
    $errors = [];

    if (mb_strlen($fullName) < 2 || mb_strlen($fullName) > 120) {
        $errors[] = 'Enter a full name between 2 and 120 characters.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
        $errors[] = 'Enter a valid email address.';
    }
    if ($phone !== '' && !preg_match('/^[0-9+() .-]{7,30}$/', $phone)) {
        $errors[] = 'Enter a valid phone number or leave it blank.';
    }
    if ($rawBarangay !== '' && ($barangayId === false || $barangayId < 1)) {
        $errors[] = 'Select a valid barangay.';
    }
    if (($user['role'] ?? '') === 'guardian' && !$barangayId) {
        $errors[] = 'Select your barangay.';
    }
    if ($barangayId) {
        $barangay = $pdo->prepare('SELECT 1 FROM barangays WHERE id = :id');
        $barangay->execute(['id' => $barangayId]);
        if (!$barangay->fetchColumn()) {
            $errors[] = 'The selected barangay is not available.';
        }
    }
    if ($errors !== []) {
        json_response(['ok' => false, 'message' => implode(' ', $errors)], 422);
    }

    try {
        Database::transaction(static function (PDO $transaction) use (
            $user,
            $fullName,
            $email,
            $phone,
            $barangayId
        ): void {
            $lock = $transaction->prepare("SELECT id FROM users WHERE id = :id AND status = 'active' LIMIT 1 FOR UPDATE");
            $lock->execute(['id' => (int) $user['id']]);
            if (!$lock->fetchColumn()) {
                throw new DomainException('Your account is no longer active.');
            }
            $duplicate = $transaction->prepare('SELECT 1 FROM users WHERE email = :email AND id <> :id LIMIT 1');
            $duplicate->execute(['email' => $email, 'id' => (int) $user['id']]);
            if ($duplicate->fetchColumn()) {
                throw new DomainException('Another account already uses that email address.');
            }
            $update = $transaction->prepare(
                'UPDATE users SET full_name = :full_name, email = :email, phone = :phone, barangay_id = :barangay_id WHERE id = :id'
            );
            $update->execute([
                'full_name' => $fullName,
                'email' => $email,
                'phone' => $phone === '' ? null : $phone,
                'barangay_id' => $barangayId ?: null,
                'id' => (int) $user['id'],
            ]);
            Audit::logRequired('account.profile_updated', 'user', (int) $user['id'], [
                'email_changed' => $email !== (string) $user['email'],
                'source' => 'mobile',
            ], (int) $user['id']);
        });
    } catch (DomainException $exception) {
        json_response(['ok' => false, 'message' => $exception->getMessage()], 422);
    } catch (PDOException $exception) {
        if ($exception->getCode() === '23000') {
            json_response(['ok' => false, 'message' => 'Another account already uses that email address.'], 422);
        }
        throw $exception;
    }
}

$statement = $pdo->prepare(
    'SELECT u.*, b.name AS barangay_name FROM users u
     LEFT JOIN barangays b ON b.id = u.barangay_id WHERE u.id = :id LIMIT 1'
);
$statement->execute(['id' => (int) $user['id']]);
$updated = $statement->fetch();
if (!$updated) {
    json_response(['ok' => false, 'message' => 'Account not found.'], 404);
}
$barangays = $pdo->query(
    'SELECT id, name, city_municipality, province FROM barangays ORDER BY name'
)->fetchAll();
foreach ($barangays as &$barangay) {
    $barangay['id'] = (int) $barangay['id'];
}
unset($barangay);

json_response([
    'ok' => true,
    'message' => ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' ? 'Profile updated.' : null,
    'user' => MobileApi::publicUser($updated),
    'barangays' => $barangays,
]);
