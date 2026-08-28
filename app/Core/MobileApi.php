<?php

declare(strict_types=1);

/** Bearer-token authentication and request helpers for the native mobile client. */
final class MobileApi
{
    private static ?array $tokenRecord = null;

    public static function initialize(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: private, no-store, max-age=0');
        header('Pragma: no-cache');
        header('Vary: Authorization');
    }

    public static function requireMethod(string ...$methods): void
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $allowed = array_map('strtoupper', $methods);
        if (!in_array($method, $allowed, true)) {
            header('Allow: ' . implode(', ', $allowed));
            json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
        }
    }

    /** @return array<string,mixed> */
    public static function input(): array
    {
        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            if ($raw === false || trim($raw) === '') {
                return [];
            }
            try {
                $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                json_response(['ok' => false, 'message' => 'The JSON request body is invalid.'], 400);
            }
            if (!is_array($decoded)) {
                json_response(['ok' => false, 'message' => 'The request body must be a JSON object.'], 400);
            }
            return $decoded;
        }
        return $_POST;
    }

    /** @return array<string,mixed> */
    public static function requireUser(): array
    {
        $token = self::bearerToken();
        if ($token === null) {
            json_response(['ok' => false, 'message' => 'Authentication required.'], 401);
        }

        $hash = hash('sha256', $token);
        $statement = Database::connection()->prepare(
            "SELECT t.id AS token_id, t.token_hash, t.user_id, t.expires_at,
                    u.*, b.name AS barangay_name
             FROM mobile_api_tokens t
             JOIN users u ON u.id = t.user_id
             LEFT JOIN barangays b ON b.id = u.barangay_id
             WHERE t.token_hash = :token_hash AND t.expires_at > NOW()
               AND t.session_version = u.session_version AND u.status = 'active'
             LIMIT 1"
        );
        $statement->execute(['token_hash' => $hash]);
        $record = $statement->fetch();
        if (!$record) {
            json_response(['ok' => false, 'message' => 'Your mobile session expired. Please sign in again.'], 401);
        }

        self::$tokenRecord = $record;
        Database::connection()->prepare(
            'UPDATE mobile_api_tokens SET last_used_at = NOW() WHERE id = :id'
        )->execute(['id' => (int) $record['token_id']]);

        unset($record['token_id'], $record['token_hash'], $record['expires_at']);
        return $record;
    }

    public static function issueToken(array $user, string $deviceName = 'Flutter mobile app'): string
    {
        $pdo = Database::connection();
        $userId = (int) $user['id'];
        $pdo->prepare('DELETE FROM mobile_api_tokens WHERE expires_at <= NOW()')->execute();

        $existing = $pdo->prepare(
            'SELECT id FROM mobile_api_tokens WHERE user_id = :user_id ORDER BY last_used_at DESC, id DESC'
        );
        $existing->execute(['user_id' => $userId]);
        $ids = array_map('intval', $existing->fetchAll(PDO::FETCH_COLUMN));
        foreach (array_slice($ids, 4) as $id) {
            $pdo->prepare('DELETE FROM mobile_api_tokens WHERE id = :id')->execute(['id' => $id]);
        }

        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $days = max(1, min(90, (int) config('mobile_token_lifetime_days', 30)));
        $statement = $pdo->prepare(
            'INSERT INTO mobile_api_tokens
                (user_id, token_hash, session_version, device_name, expires_at)
             VALUES (:user_id, :token_hash, :session_version, :device_name,
                     DATE_ADD(NOW(), INTERVAL :lifetime DAY))'
        );
        $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $statement->bindValue(':token_hash', hash('sha256', $token));
        $statement->bindValue(':session_version', (int) $user['session_version'], PDO::PARAM_INT);
        $statement->bindValue(':device_name', mb_substr(trim($deviceName), 0, 120) ?: 'Flutter mobile app');
        $statement->bindValue(':lifetime', $days, PDO::PARAM_INT);
        $statement->execute();

        Audit::log('mobile.token_issued', 'user', $userId, ['device_name' => $deviceName], $userId);
        return $token;
    }

    public static function revokeCurrent(): void
    {
        if (self::$tokenRecord === null) {
            self::requireUser();
        }
        $record = self::$tokenRecord;
        if (!$record) {
            return;
        }
        Database::connection()->prepare('DELETE FROM mobile_api_tokens WHERE id = :id')
            ->execute(['id' => (int) $record['token_id']]);
        Audit::log('mobile.token_revoked', 'user', (int) $record['user_id'], [], (int) $record['user_id']);
        self::$tokenRecord = null;
    }

    /** @return array<string,mixed> */
    public static function publicUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'full_name' => (string) $user['full_name'],
            'email' => (string) $user['email'],
            'phone' => $user['phone'] === null ? null : (string) $user['phone'],
            'role' => (string) $user['role'],
            'barangay_id' => $user['barangay_id'] === null ? null : (int) $user['barangay_id'],
            'barangay_name' => $user['barangay_name'] ?? null,
        ];
    }

    private static function bearerToken(): ?string
    {
        $header = (string) ($_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '');
        if ($header === '' && function_exists('getallheaders')) {
            $headers = getallheaders();
            $header = is_array($headers) ? (string) ($headers['Authorization'] ?? $headers['authorization'] ?? '') : '';
        }
        if (!preg_match('/^Bearer\s+([A-Za-z0-9_-]{40,100})$/i', trim($header), $matches)) {
            return null;
        }
        return $matches[1];
    }
}
