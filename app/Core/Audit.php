<?php

declare(strict_types=1);

final class Audit
{
    public static function log(string $action, ?string $entityType = null, int|string|null $entityId = null, array $details = [], ?int $userId = null): void
    {
        try {
            self::write($action, $entityType, $entityId, $details, $userId);
        } catch (Throwable $exception) {
            if (config('debug')) {
                error_log('Audit logging failed: ' . $exception->getMessage());
            }
        }
    }

    /** Write a security-critical audit row and let failure abort the caller's transaction. */
    public static function logRequired(string $action, ?string $entityType = null, int|string|null $entityId = null, array $details = [], ?int $userId = null): void
    {
        self::write($action, $entityType, $entityId, $details, $userId);
    }

    private static function write(string $action, ?string $entityType, int|string|null $entityId, array $details, ?int $userId): void
    {
        $detailsJson = $details === []
            ? null
            : json_encode($details, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $statement = Database::connection()->prepare(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json, ip_address, user_agent)
             VALUES (:user_id, :action, :entity_type, :entity_id, :details_json, :ip_address, :user_agent)'
        );
        $statement->execute([
            'user_id' => $userId ?? ($_SESSION['user_id'] ?? null),
            'action' => substr($action, 0, 100),
            'entity_type' => $entityType ? substr($entityType, 0, 60) : null,
            'entity_id' => $entityId === null ? null : substr((string) $entityId, 0, 64),
            'details_json' => $detailsJson,
            'ip_address' => client_ip(),
            'user_agent' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'CLI'), 0, 255),
        ]);
    }
}
