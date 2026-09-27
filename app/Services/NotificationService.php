<?php
declare(strict_types=1);

namespace App\Services;

use PDO;

final class NotificationService
{
    public function __construct(private readonly PDO $pdo) {}

    public function syncForUser(array $user): void
    {
        if (!in_array($user['role'] ?? '', ['expert', 'system_admin'], true)) return;
        $recipientId = (int) $user['id'];
        $statement = $this->pdo->prepare(
            "INSERT IGNORE INTO notifications (user_id, type, title, message, link, dedupe_key)
             SELECT :user_id, 'report_pending', 'Report awaiting review',
                    CONCAT(r.report_code, ' from ', u.full_name, ' is ', r.suggested_health, ' and needs review.'),
                    CONCAT('admin/report.php?id=', r.id), CONCAT('report_pending:{$recipientId}:', r.id)
             FROM reports r JOIN users u ON u.id = r.user_id WHERE r.status = 'pending'"
        );
        $statement->execute(['user_id' => (int) $user['id']]);
        $attention = $this->pdo->prepare(
            "INSERT IGNORE INTO notifications (user_id, type, title, message, link, dedupe_key)
             SELECT :user_id, 'needs_attention', 'Monitoring site needs attention',
                    CONCAT(r.report_code, ' is marked for attention. Review the report and follow-up guidance.'),
                    CONCAT('admin/report.php?id=', r.id), CONCAT('staff_attention:{$recipientId}:', r.id)
             FROM reports r WHERE r.status = 'verified' AND r.needs_attention = 1"
        );
        $attention->execute(['user_id' => (int) $user['id']]);
        $resolved = $this->pdo->prepare(
            "UPDATE notifications n JOIN reports r ON n.dedupe_key = CONCAT('report_pending:', n.user_id, ':', r.id)
             SET n.read_at = COALESCE(n.read_at, NOW())
             WHERE n.user_id = :user_id AND r.status <> 'pending'"
        );
        $resolved->execute(['user_id' => (int) $user['id']]);
    }

    public function syncStaff(): void
    {
        foreach ($this->pdo->query("SELECT id, role FROM users WHERE status = 'active' AND role IN ('expert', 'system_admin')")->fetchAll() as $user) {
            $this->syncForUser($user);
        }
    }

    public function listing(array $user, int $page = 1): array
    {
        $this->syncForUser($user);
        $count = $this->pdo->prepare('SELECT COUNT(*) AS total, COALESCE(SUM(read_at IS NULL), 0) AS unread FROM notifications WHERE user_id = :id');
        $count->execute(['id' => (int) $user['id']]);
        $counts = $count->fetch();
        $pages = max(1, (int) ceil((int) $counts['total'] / 20));
        $page = max(1, min($page, $pages));
        $offset = ($page - 1) * 20;
        $query = $this->pdo->prepare("SELECT id, type, title, message, link, read_at, created_at FROM notifications WHERE user_id = :id ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET {$offset}");
        $query->execute(['id' => (int) $user['id']]);
        return ['notifications' => $query->fetchAll(), 'unread' => (int) $counts['unread'], 'page' => $page, 'pages' => $pages];
    }
}
