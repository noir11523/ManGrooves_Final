<?php
declare(strict_types=1);

final class CloudAuth
{
    private static ?array $viewer = null;
    public static function user(): ?array
    {
        if (empty($_SESSION['access_token'])) return null;
        if (self::$viewer !== null) return self::$viewer;
        try { self::$viewer = CloudClient::api('me.php')['user']; }
        catch (CloudError $error) {
            if (!in_array($error->status, [401, 403], true)) throw $error;
            CloudSession::clear();
            flash('warning', $error->getMessage());
        }
        return self::$viewer;
    }
    public static function check(): bool { return self::user() !== null; }
    public static function requireLogin(): array
    {
        $user = self::user();
        if (!$user) redirect('login.php');
        return $user;
    }
    public static function requireRoles(array $roles): array
    {
        $user = self::requireLogin();
        if (!in_array($user['role'], $roles, true)) throw new CloudError('You do not have access to this page.', 403);
        return $user;
    }
}
class_alias(CloudAuth::class, 'Auth');
