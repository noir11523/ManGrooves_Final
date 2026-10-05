<?php
declare(strict_types=1);
$root = __DIR__ . '/dist';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (in_array($path, ['/downloads/ManGROOVES-Supabase.apk', '/downloads/ManGROOVES-Supabase.apk.sha256'], true) && is_file($root . $path)) {
    $apk = str_ends_with($path, '.apk');
    header('Content-Type: ' . ($apk ? 'application/vnd.android.package-archive' : 'text/plain'));
    if ($apk) header('Content-Disposition: attachment; filename="ManGROOVES-Supabase.apk"');
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: ' . filesize($root . $path));
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'HEAD') readfile($root . $path);
    return true;
}
if (is_string($path) && !str_contains($path, '..') && !str_contains($path, '%') && !str_contains($path, '\\')
    && (($path === '/manifest.webmanifest') || preg_match('~^/assets/[a-zA-Z0-9_./-]+\.(css|js|png|jpg|jpeg|webp|svg|gif|ico)$~D', $path))
    && is_file($root . $path)) {
    return false;
}
require $root . '/api/index.php';
