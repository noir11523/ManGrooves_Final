<?php
declare(strict_types=1);
namespace App\Services;
use PDO;
use DomainException;

final class ValidationHistory
{
    public function __construct(private readonly PDO $pdo) {}

    public function forStaff(array $user, int $page = 1): array
    {
        if (!in_array($user['role'] ?? '', ['expert', 'system_admin'], true)) throw new DomainException('Staff access required.');
        // Include automatic Healthy verification as well as every recorded staff decision.
        $events = "SELECT vl.id AS event_id, vl.report_id, vl.action, vl.created_at, vl.new_health AS health,
                          vl.new_status AS status, vl.comment, u.full_name AS reviewer, r.report_code
                   FROM verification_logs vl JOIN reports r ON r.id = vl.report_id JOIN users u ON u.id = vl.verifier_id
                   UNION ALL
                   SELECT 0, r.id, 'automatic', r.verified_at, r.final_health, r.status, NULL, 'System', r.report_code
                   FROM reports r WHERE r.status = 'verified' AND r.expert_id IS NULL
                   AND NOT EXISTS (SELECT 1 FROM verification_logs vl WHERE vl.report_id = r.id)";
        $total = (int) $this->pdo->query('SELECT COUNT(*) FROM (' . $events . ') events')->fetchColumn();
        $pages = max(1, (int) ceil($total / 20));
        $page = max(1, min($pages, $page));
        $offset = ($page - 1) * 20;
        $items = $this->pdo->query('SELECT * FROM (' . $events . ') events ORDER BY created_at DESC, report_id DESC, event_id DESC LIMIT 20 OFFSET ' . $offset)->fetchAll();
        return compact('items', 'total', 'page', 'pages');
    }
}
