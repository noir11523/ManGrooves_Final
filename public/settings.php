<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

$user = Auth::requireLogin();
$pdo = Database::connection();
$profileErrors = [];
$passwordErrors = [];
$profileValues = [
    'first_name' => (string) ($user['first_name'] ?? ''),
    'last_name' => (string) ($user['last_name'] ?? ''),
    'email' => (string) $user['email'],
    'phone' => (string) ($user['phone'] ?? ''),
    'barangay_id' => (string) ($user['barangay_id'] ?? ''),
];

if (is_post()) {
    Csrf::validateOrFail();
    $action = scalar_string($_POST['action'] ?? null);

    if ($action === 'profile') {
        $profileValues = [
            'first_name' => trim(scalar_string($_POST['first_name'] ?? null)),
            'last_name' => trim(scalar_string($_POST['last_name'] ?? null)),
            'email' => (string) $user['email'],
            'phone' => trim(scalar_string($_POST['phone'] ?? null)),
            'barangay_id' => trim(scalar_string($_POST['barangay_id'] ?? null)),
        ];

        if (isset($_POST['email']) && scalar_string($_POST['email']) !== $user['email']) {
            $profileErrors[] = 'Your email address cannot be changed.';
        }
        try {
            $names = \App\Services\UserName::fromInput($profileValues);
        } catch (InvalidArgumentException $exception) {
            $profileErrors[] = $exception->getMessage();
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

        if ($profileErrors === []) {
            $statement = $pdo->prepare(
                'UPDATE users SET first_name = :first_name, last_name = :last_name, full_name = :full_name, phone = :phone, barangay_id = :barangay_id WHERE id = :id'
            );
            $statement->execute([
                ...$names,
                'phone' => $profileValues['phone'] === '' ? null : $profileValues['phone'],
                'barangay_id' => $barangayId,
                'id' => (int) $user['id'],
            ]);
            Audit::log('account.profile_updated', 'user', (int) $user['id'], ['email_changed' => false]);
            Auth::forgetUser();
            flash('success', 'Your profile information has been updated.');
            redirect('settings.php');
        }
    } elseif ($action === 'password') {
        try {
            $version = \App\Services\AccountSecurity::update($user, $_POST);
            if (!headers_sent()) {
                session_regenerate_id(true);
            }
            $_SESSION['session_version'] = $version;
            Auth::forgetUser();
            flash('success', 'Password changed. Other sessions have been signed out.');
            redirect('settings.php#password-heading');
        } catch (InvalidArgumentException $error) {
            $passwordErrors[] = $error->getMessage();
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
