<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

if (Auth::check()) {
    redirect('dashboard.php');
}

$errors = [];
$barangays = [];

try {
    $barangays = Database::connection()
        ->query('SELECT id, name, city_municipality FROM barangays ORDER BY name')
        ->fetchAll();
    if ($barangays === []) {
        $errors[] = 'Registration is unavailable because no barangay is configured. Please contact the system administrator.';
    }
} catch (Throwable $exception) {
    if (config('debug')) {
        error_log('Unable to load barangays: ' . $exception->getMessage());
    }
    $errors[] = 'Registration is temporarily unavailable. Please try again shortly.';
}

if (is_post()) {
    Csrf::validateOrFail();
    remember_old_input($_POST);
    if ($barangays !== []) {
        // Both fields are required on the website, including requests without JavaScript.
        $registrationData = $_POST;
        $registrationData['first_name'] = $_POST['first_name'] ?? '';
        $registrationData['last_name'] = $_POST['last_name'] ?? '';
        try {
            [$registered, $registrationErrors] = Auth::registerGuardian($registrationData);
        } catch (Throwable $exception) {
            error_log('Unable to register guardian: ' . $exception->getMessage());
            $registered = false;
            $registrationErrors = ['Registration is temporarily unavailable. Please try again shortly.'];
        }

        if ($registered) {
            clear_old_input();
            flash('success', 'Welcome to ManGROOVES! Your guardian account is ready.');
            redirect('dashboard.php');
        }
        $errors = array_merge($errors, $registrationErrors);
    }
}

render('auth/register', [
    'pageTitle' => 'Become a guardian',
    'pageDescription' => 'Create a ManGROOVES guardian account and contribute field observations to community mangrove monitoring.',
    'layout' => 'public',
    'bodyClass' => 'auth-body',
    'errors' => $errors,
    'barangays' => $barangays,
]);
