<?php

declare(strict_types=1);

namespace App\Services;

final class UserName
{
    /** Legacy clients may still send a full name; never guess its family-name boundary. */
    public static function fromInput(array $data, bool $allowLegacy = false, array $existing = []): array
    {
        if (array_key_exists('first_name', $data) || array_key_exists('last_name', $data) || !$allowLegacy) {
            $first = trim(\scalar_string($data['first_name'] ?? null));
            $last = trim(\scalar_string($data['last_name'] ?? null));
            if ($first === '' || mb_strlen($first) > 60) {
                throw new \InvalidArgumentException('Enter a first name between 1 and 60 characters.');
            }
            if ($last === '' || mb_strlen($last) > 59) {
                throw new \InvalidArgumentException('Enter a last name between 1 and 59 characters.');
            }
            return ['first_name' => $first, 'last_name' => $last, 'full_name' => $first . ' ' . $last];
        }
        $full = trim(\scalar_string($data['full_name'] ?? null));
        if (mb_strlen($full) < 2 || mb_strlen($full) > 120) {
            throw new \InvalidArgumentException('Enter a full name between 2 and 120 characters.');
        }
        $unchanged = $full === ($existing['full_name'] ?? null);
        return [
            'first_name' => $unchanged ? ($existing['first_name'] ?? null) : null,
            'last_name' => $unchanged ? ($existing['last_name'] ?? null) : null,
            'full_name' => $full,
        ];
    }
}
