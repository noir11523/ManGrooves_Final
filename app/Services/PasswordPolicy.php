<?php
declare(strict_types=1);

namespace App\Services;

final class PasswordPolicy
{
    public static function isValid(string $password): bool
    {
        return mb_check_encoding($password, 'UTF-8') && mb_strlen($password) >= 8
            && mb_strlen($password) <= 25 && strlen($password) <= 72
            && !str_contains($password, "\0");
    }
}
