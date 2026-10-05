<?php
declare(strict_types=1);
define('APP_ROOT', dirname(__DIR__, 2));
define('MANGROOVES_CLOUD', true);
require APP_ROOT . '/app/Core/Helpers.php';
require __DIR__ . '/Session.php';
require __DIR__ . '/Client.php';
require __DIR__ . '/Auth.php';
require APP_ROOT . '/app/Core/Csrf.php';
$GLOBALS['app_config'] = ['name' => 'ManGROOVES', 'url' => '', 'debug' => false];
// A single entry point keeps old /admin/*.php URLs root-relative on Vercel.
$_SERVER['SCRIPT_NAME'] = '/api/index.php';
date_default_timezone_set('Asia/Manila');
ini_set('display_errors', '0');
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(self), camera=(self), microphone=()');
header("Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://photon.komoot.io https://get.geojs.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
ob_start();
CloudSession::start();
register_shutdown_function(static function (): void { CloudSession::save(); });
