<?php
declare(strict_types=1);

/** Encrypted, authenticated cookies: no local session files on Vercel. */
final class CloudSession
{
    public const NAME = 'mangrooves_cloud';
    private static string $key;
    public static function start(): void
    {
        $encoded = (string) getenv('APP_KEY');
        $key = base64_decode($encoded, true);
        if ($key === false || strlen($key) !== 32) {
            throw new RuntimeException('Set APP_KEY to a base64-encoded 32-byte random key.');
        }
        self::$key = $key;
        $_SESSION = self::decode((string) ($_COOKIE[self::NAME] ?? ''), $key);
        if (isset($_SESSION['last_active']) && (int) $_SESSION['last_active'] < time() - 1800) $_SESSION = [];
        $_SESSION['last_active'] = time();
        $_SESSION['_csrf'] ??= bin2hex(random_bytes(32));
    }
    public static function encode(array $data, string $key): string
    {
        $iv = random_bytes(12);
        $cipher = openssl_encrypt(json_encode($data, JSON_THROW_ON_ERROR), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, self::NAME);
        if ($cipher === false) throw new RuntimeException('Could not secure the session.');
        return rtrim(strtr(base64_encode($iv . $tag . $cipher), '+/', '-_'), '=');
    }
    public static function decode(string $cookie, string $key): array
    {
        if (strlen($cookie) > 4096) return [];
        $bytes = base64_decode(strtr($cookie, '-_', '+/'), true);
        if ($bytes === false || strlen($bytes) < 29) return [];
        $plain = openssl_decrypt(substr($bytes, 28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($bytes, 0, 12), substr($bytes, 12, 16), self::NAME);
        $data = $plain === false ? null : json_decode($plain, true);
        return is_array($data) ? $data : [];
    }
    public static function save(): void
    {
        if (!isset(self::$key) || headers_sent()) return;
        // Never persist submitted forms, passwords, or report photos in a cookie.
        $data = array_intersect_key($_SESSION, array_flip(['access_token', 'refresh_token', 'expires_at', 'last_active', '_csrf', '_flash']));
        $value = self::encode($data, self::$key);
        if (strlen($value) > 3800) { unset($data['_flash']); $value = self::encode($data, self::$key); }
        if (strlen($value) > 3800) throw new RuntimeException('The session is too large.');
        setcookie(self::NAME, $value, ['expires' => 0, 'path' => '/', 'secure' => getenv('VERCEL') === '1' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'), 'httponly' => true, 'samesite' => 'Lax']);
    }
    public static function clear(): void
    {
        $_SESSION = ['last_active' => time(), '_csrf' => bin2hex(random_bytes(32))];
    }
}
