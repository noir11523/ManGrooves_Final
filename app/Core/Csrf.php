<?php

declare(strict_types=1);

final class Csrf
{
    public static function token(): string
    {
        if (empty($_SESSION['_csrf'])) {
            $_SESSION['_csrf'] = bin2hex(random_bytes(32));
        }
        return (string) $_SESSION['_csrf'];
    }

    public static function field(): string
    {
        return '<input type="hidden" name="csrf_token" value="' . e(self::token()) . '">';
    }

    public static function isValid(?string $token = null): bool
    {
        if ($token === null) {
            $rawToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
            if (!is_string($rawToken)) {
                return false;
            }
            $token = $rawToken;
        }
        $stored = $_SESSION['_csrf'] ?? '';
        if (!is_string($stored)) {
            return false;
        }
        return $stored !== '' && $token !== '' && hash_equals($stored, $token);
    }

    public static function validateOrFail(): void
    {
        if (!self::isValid()) {
            send_http_status(419);
            if (str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json')) {
                json_response(['ok' => false, 'message' => 'Your form session expired. Refresh and try again.'], 419);
            }
            exit('Your form session expired. Please return to the previous page, refresh it, and try again.');
        }
    }
}
