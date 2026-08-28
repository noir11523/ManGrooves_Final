<?php

declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));

require_once APP_ROOT . '/app/Core/Helpers.php';
load_env_file(APP_ROOT . '/.env');
$GLOBALS['app_config'] = require APP_ROOT . '/config/app.php';

date_default_timezone_set((string) config('timezone', 'Asia/Manila'));

if (config('debug')) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $sessionDirectory = APP_ROOT . '/storage/sessions';
    if (!is_dir($sessionDirectory)) {
        mkdir($sessionDirectory, 0775, true);
    }
    session_save_path($sessionDirectory);
    ini_set('session.gc_maxlifetime', (string) config('session_lifetime', 1800));
    ini_set('session.use_strict_mode', '1');
    session_name('mangrooves_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

require_once APP_ROOT . '/app/Core/Database.php';
require_once APP_ROOT . '/app/Core/Csrf.php';
require_once APP_ROOT . '/app/Core/Audit.php';
require_once APP_ROOT . '/app/Core/Auth.php';
require_once APP_ROOT . '/app/Core/MobileApi.php';

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $path = APP_ROOT . '/app/' . $relative . '.php';
    if (is_file($path)) {
        require_once $path;
    }
});

Auth::enforceSessionLifetime();

if (PHP_SAPI !== 'cli' && !headers_sent()) {
    header('X-Frame-Options: SAMEORIGIN');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(self), geolocation=(self), microphone=()');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; connect-src 'self' https://*.tile.openstreetmap.org; font-src 'self' data: https://cdn.jsdelivr.net; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
}
