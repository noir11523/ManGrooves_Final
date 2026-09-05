<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

if (Auth::check()) {
    redirect('dashboard.php');
}

$errors = [];
$fieldErrors = [];

if (is_post()) {
    Csrf::validateOrFail();

    $email = strtolower(trim(scalar_string($_POST['email'] ?? null)));
    $password = scalar_string($_POST['password'] ?? null);
    remember_old_input(['email' => $email]);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
        $fieldErrors['email'] = 'Enter a valid email address.';
    }
    if ($password === '' || strlen($password) > 72) {
        $fieldErrors['password'] = 'Enter your password.';
    }

    if ($fieldErrors === []) {
        [$authenticated, $message] = Auth::attempt($email, $password);
        if ($authenticated) {
            clear_old_input();
            flash('success', 'Welcome back. You are now signed in.');
            redirect('dashboard.php');
        }
        $errors[] = (string) $message;
    } else {
        $errors[] = 'Correct the highlighted fields and try again.';
    }
}

render('auth/login', [
    'pageTitle' => 'Sign in',
    'pageDescription' => 'Sign in securely to your ManGROOVES guardian or conservation team account.',
    'layout' => 'public',
    'bodyClass' => 'auth-body',
    'errors' => $errors,
    'fieldErrors' => $fieldErrors,
]);
