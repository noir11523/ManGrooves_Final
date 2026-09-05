<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

if (!is_post()) {
    flash('warning', 'Use the sign-out button to end your session securely.');
    redirect(Auth::check() ? 'dashboard.php' : 'login.php');
}

Csrf::validateOrFail();
Auth::logout();
flash('success', 'You have been signed out safely.');
redirect('index.php');
