<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

$user = Auth::requireLogin();
$pdo = Database::connection();
$profileErrors = [];
$passwordErrors = [];
$profileValues = [
    'full_name' => (string) $user['full_name'],
    'email' => (string) $user['email'],
    'phone' => (string) ($user['phone'] ?? ''),
    'barangay_id' => (string) ($user['barangay_id'] ?? ''),
];

if (is_post()) {
    Csrf::validateOrFail();
    $action = scalar_string($_POST['action'] ?? null);

    if ($action === 'profile') {
        $profileValues = [
            'full_name' => trim(scalar_string($_POST['full_name'] ?? null)),
            'email' => strtolower(trim(scalar_string($_POST['email'] ?? null))),
            'phone' => trim(scalar_string($_POST['phone'] ?? null)),
            'barangay_id' => trim(scalar_string($_POST['barangay_id'] ?? null)),
        ];

        if (mb_strlen($profileValues['full_name']) < 2 || mb_strlen($profileValues['full_name']) > 120) {
            $profileErrors[] = 'Enter a full name between 2 and 120 characters.';
        }
        if (!filter_var($profileValues['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($profileValues['email']) > 190) {
            $profileErrors[] = 'Enter a valid email address.';
        }
        if ($profileValues['phone'] !== '' && !preg_match('/^[0-9+() .-]{7,30}$/', $profileValues['phone'])) {
            $profileErrors[] = 'Enter a valid phone number or leave it blank.';
        }

        $barangayId = filter_var($profileValues['barangay_id'], FILTER_VALIDATE_INT) ?: null;
        if ($user['role'] === 'guardian' && !$barangayId) {
            $profileErrors[] = 'Select your barangay.';
        }
        if ($barangayId) {
            $barangayCheck = $pdo->prepare('SELECT 1 FROM barangays WHERE id = :id');
            $barangayCheck->execute(['id' => $barangayId]);
            if (!$barangayCheck->fetchColumn()) {
                $profileErrors[] = 'The selected barangay is not available.';
            }
        }

        $emailCheck = $pdo->prepare('SELECT 1 FROM users WHERE email = :email AND id <> :id');
        $emailCheck->execute(['email' => $profileValues['email'], 'id' => (int) $user['id']]);
        if ($emailCheck->fetchColumn()) {
            $profileErrors[] = 'Another account already uses that email address.';
        }

        if ($profileErrors === []) {
            $statement = $pdo->prepare(
                'UPDATE users SET full_name = :full_name, email = :email, phone = :phone, barangay_id = :barangay_id WHERE id = :id'
            );
            try {
                $statement->execute([
                    'full_name' => $profileValues['full_name'],
                    'email' => $profileValues['email'],
                    'phone' => $profileValues['phone'] === '' ? null : $profileValues['phone'],
                    'barangay_id' => $barangayId,
                    'id' => (int) $user['id'],
                ]);
                Audit::log('account.profile_updated', 'user', (int) $user['id'], ['email_changed' => $profileValues['email'] !== $user['email']]);
                Auth::forgetUser();
                flash('success', 'Your profile information has been updated.');
                redirect('settings.php');
            } catch (PDOException $exception) {
                if ($exception->getCode() === '23000') {
                    $profileErrors[] = 'Another account already uses that email address.';
                } else {
                    throw $exception;
                }
            }
        }
    } elseif ($action === 'password') {
        $currentPassword = scalar_string($_POST['current_password'] ?? null);
        $newPassword = scalar_string($_POST['new_password'] ?? null);
        $confirmation = scalar_string($_POST['new_password_confirmation'] ?? null);

        if (str_contains($currentPassword, "\0") || !password_verify($currentPassword, (string) $user['password_hash'])) {
            $passwordErrors[] = 'Your current password is incorrect.';
        }
        if (strlen($newPassword) < 8 || strlen($newPassword) > 72 || str_contains($newPassword, "\0")) {
            $passwordErrors[] = 'Use a new password between 8 and 72 characters.';
        }
        if ($newPassword !== $confirmation) {
            $passwordErrors[] = 'The new password confirmation does not match.';
        }
        if ($currentPassword !== '' && hash_equals($currentPassword, $newPassword)) {
            $passwordErrors[] = 'Choose a new password that differs from your current password.';
        }

        if ($passwordErrors === []) {
            $statement = $pdo->prepare(
                'UPDATE users
                 SET password_hash = :password_hash,
                     session_version = LAST_INSERT_ID(session_version + 1)
                 WHERE id = :id'
            );
            $statement->execute([
                'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
                'id' => (int) $user['id'],
            ]);
            $newSessionVersion = (int) $pdo->lastInsertId();
            Audit::log('account.password_changed', 'user', (int) $user['id']);
            if (!headers_sent()) {
                session_regenerate_id(true);
            }
            $_SESSION['session_version'] = $newSessionVersion;
            Auth::forgetUser();
            flash('success', 'Your password has been changed securely.');
            redirect('settings.php#password-heading');
        }
    } else {
        http_response_code(400);
        $profileErrors[] = 'The requested settings action is not available.';
    }
}

$barangays = $pdo->query('SELECT id, name, city_municipality FROM barangays ORDER BY name')->fetchAll();

render('settings', [
    'pageTitle' => 'Settings',
    'pageDescription' => 'Update your ManGROOVES profile and account password.',
    'bodyClass' => 'settings-page',
    'user' => $user,
    'barangays' => $barangays,
    'profileValues' => $profileValues,
    'profileErrors' => $profileErrors,
    'passwordErrors' => $passwordErrors,
]);
