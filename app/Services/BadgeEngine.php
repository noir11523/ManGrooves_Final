<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class BadgeEngine
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** Convenience entry point used by verification workflows. */
    public static function awardForUser(int $userId): array
    {
        return (new self(\Database::connection()))->evaluateForUser($userId);
    }

    /**
     * Awards every newly satisfied active badge without duplicating an award.
     *
     * @return list<array<string,mixed>> newly earned badges
     */
    public function evaluateForUser(int $userId): array
    {
        if ($userId < 1) {
            return [];
        }

        $startedHere = !$this->pdo->inTransaction();
        if ($startedHere) {
            $this->pdo->beginTransaction();
        }

        try {
            // Serialize badge evaluation per guardian. This prevents two concurrent
            // verifications from both reading a pre-threshold metrics snapshot.
            $ownerLock = $this->pdo->prepare('SELECT id FROM users WHERE id = :id LIMIT 1 FOR UPDATE');
            $ownerLock->execute(['id' => $userId]);
            if (!$ownerLock->fetchColumn()) {
                if ($startedHere) {
                    $this->pdo->rollBack();
                }
                return [];
            }

            $metrics = $this->metricsForUser($userId);
            $badges = $this->pdo->query('SELECT * FROM badges WHERE active = 1 ORDER BY target_value, id')->fetchAll();
            $insert = $this->pdo->prepare(
                'INSERT IGNORE INTO user_badges
                    (user_id, badge_id, badge_name_snapshot, description_snapshot, metric_snapshot,
                     target_value_snapshot, image_path_snapshot)
                 VALUES
                    (:user_id, :badge_id, :badge_name, :description, :metric, :target_value, :image_path)'
            );
            $notification = $this->pdo->prepare(
                "INSERT INTO notifications (user_id, type, title, message, link)
                 VALUES (:user_id, 'badge_earned', :title, :message, 'badges.php')"
            );
            $newlyEarned = [];

            foreach ($badges as $badge) {
                $metric = (string) $badge['metric'];
                $current = (int) ($metrics[$metric] ?? 0);
                if ($current < (int) $badge['target_value']) {
                    continue;
                }
                $insert->execute([
                    'user_id' => $userId,
                    'badge_id' => (int) $badge['id'],
                    'badge_name' => $badge['badge_name'],
                    'description' => $badge['description'],
                    'metric' => $badge['metric'],
                    'target_value' => $badge['target_value'],
                    'image_path' => $badge['image_path'],
                ]);
                if ($insert->rowCount() !== 1) {
                    continue;
                }
                $notification->execute([
                    'user_id' => $userId,
                    'title' => 'Badge earned: ' . $badge['badge_name'],
                    'message' => (string) $badge['description'],
                ]);
                $badge['current_value'] = $current;
                $newlyEarned[] = $badge;
            }

            if ($startedHere) {
                $this->pdo->commit();
            }
            return $newlyEarned;
        } catch (\Throwable $exception) {
            if ($startedHere && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @return array<string,int> */
    public function metricsForUser(int $userId): array
    {
        $statement = $this->pdo->prepare(
            "SELECT
                SUM(r.status = 'verified') AS verified_reports,
                SUM(r.status = 'verified' AND r.parent_report_id IS NOT NULL) AS verified_followups,
                COUNT(DISTINCT CASE WHEN r.status = 'verified' THEN r.final_species_id END) AS distinct_species,
                SUM(r.status = 'verified' AND NOT EXISTS (
                    SELECT 1 FROM verification_logs vl
                    WHERE vl.report_id = r.id AND vl.action = 'correct'
                )) AS uncorrected_reports,
                COALESCE(DATEDIFF(CURDATE(), DATE(MIN(CASE WHEN r.status = 'verified'
                    THEN COALESCE(r.verified_at, r.submitted_at) END))) + 1, 0) AS steward_days
             FROM reports r WHERE r.user_id = :user_id"
        );
        $statement->execute(['user_id' => $userId]);
        $row = $statement->fetch() ?: [];

        return [
            'verified_reports' => (int) ($row['verified_reports'] ?? 0),
            'verified_followups' => (int) ($row['verified_followups'] ?? 0),
            'distinct_species' => (int) ($row['distinct_species'] ?? 0),
            'uncorrected_reports' => (int) ($row['uncorrected_reports'] ?? 0),
            'steward_days' => (int) ($row['steward_days'] ?? 0),
        ];
    }

    /** @return list<array<string,mixed>> */
    public function progressForUser(int $userId): array
    {
        $metrics = $this->metricsForUser($userId);
        $statement = $this->pdo->prepare(
            'SELECT b.*,
                    COALESCE(ub.badge_name_snapshot, b.badge_name) AS badge_name,
                    COALESCE(ub.description_snapshot, b.description) AS description,
                    COALESCE(ub.metric_snapshot, b.metric) AS metric,
                    COALESCE(ub.target_value_snapshot, b.target_value) AS target_value,
                    COALESCE(ub.image_path_snapshot, b.image_path) AS image_path,
                    ub.earned_at
             FROM badges b
             LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = :user_id
             WHERE b.active = 1 OR ub.earned_at IS NOT NULL
             ORDER BY (ub.earned_at IS NULL), ub.earned_at, b.target_value, b.id'
        );
        $statement->execute(['user_id' => $userId]);
        $result = [];
        foreach ($statement->fetchAll() as $badge) {
            $current = (int) ($metrics[(string) $badge['metric']] ?? 0);
            $target = max(1, (int) $badge['target_value']);
            $badge['current_value'] = $current;
            $badge['progress_percent'] = min(100, round(($current / $target) * 100, 1));
            $badge['earned'] = $badge['earned_at'] !== null;
            $result[] = $badge;
        }
        return $result;
    }
}
