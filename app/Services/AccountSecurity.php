<?php
declare(strict_types=1);
namespace App\Services;

use PDO;
use InvalidArgumentException;

final class AccountSecurity
{
    public static function update(array $user, array $input): int
    {
        $action = scalar_string($input['action'] ?? null);
        if ($action !== 'password') {
            throw new InvalidArgumentException('Choose a valid account action.');
        }
        return \Database::transaction(static function (PDO $pdo) use ($user, $input): int {
            $query = $pdo->prepare('SELECT * FROM users WHERE id = ? FOR UPDATE');
            $query->execute([(int) $user['id']]);
            $current = $query->fetch();
            if (!$current || $current['status'] !== 'active' || (int) $current['session_version'] !== (int) $user['session_version']) {
                throw new InvalidArgumentException('Please sign in again.');
            }
            $password = scalar_string($input['current_password'] ?? null);
            if (str_contains($password, "\0") || !password_verify($password, $current['password_hash'])) {
                throw new InvalidArgumentException('Your current password is incorrect.');
            }
            $version = (int) $current['session_version'] + 1;
            $new = scalar_string($input['new_password'] ?? null);
            if (!PasswordPolicy::isValid($new)) {
                throw new InvalidArgumentException('Use 8 to 25 characters.');
            }
            if ($new !== scalar_string($input['new_password_confirmation'] ?? null)) {
                throw new InvalidArgumentException('The new passwords do not match.');
            }
            if (hash_equals($password, $new)) {
                throw new InvalidArgumentException('Choose a different new password.');
            }
            $pdo->prepare('UPDATE users SET password_hash = ?, session_version = ? WHERE id = ?')
                ->execute([password_hash($new, PASSWORD_DEFAULT), $version, $user['id']]);
            $pdo->prepare('DELETE FROM mobile_api_tokens WHERE user_id = ?')->execute([$user['id']]);
            \Audit::logRequired('account.password_changed', 'user', (int) $user['id'], [], (int) $user['id']);
            return $version;
        });
    }
}
