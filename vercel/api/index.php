<?php
declare(strict_types=1);

// Only this front controller executes on Vercel; no MySQL or local uploads.
try {
    require dirname(__DIR__) . '/app/Cloud/bootstrap.php';
    require APP_ROOT . '/public/index.php';
} catch (Throwable $error) {
    $status = $error instanceof CloudError ? $error->status : 503;
    http_response_code($status);
    header('Cache-Control: private, no-store');
    header('Content-Type: text/html; charset=utf-8');
    // Never reveal environment variables, tokens, or upstream internals.
    $message = $error instanceof CloudError ? $error->getMessage() : 'The website could not connect. Please try again shortly.';
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ManGROOVES</title><main style="font:18px system-ui;max-width:640px;margin:12vh auto;padding:24px"><h1>ManGROOVES</h1><p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p><p><a href="/index.php">Home</a> · <a href="/login.php">Sign in</a></p></main></html>';
}
