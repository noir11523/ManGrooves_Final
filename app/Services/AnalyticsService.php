<?php

declare(strict_types=1);

namespace App\Services;

use DateTimeImmutable;
use PDO;

final class AnalyticsService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{date_from:string,date_to:string,barangay_id:?int,species_id:?int} */
    public function normalizeFilters(array $input): array
    {
        $today = new DateTimeImmutable('today');
        $defaultFrom = $today->modify('-11 months')->modify('first day of this month');
        $from = $this->validDate(\scalar_string($input['date_from'] ?? null)) ?? $defaultFrom;
        $to = $this->validDate(\scalar_string($input['date_to'] ?? null)) ?? $today;
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }

        return [
            'date_from' => $from->format('Y-m-d'),
            'date_to' => $to->format('Y-m-d'),
            'barangay_id' => $this->positiveInt($input['barangay_id'] ?? null),
            'species_id' => $this->positiveInt($input['species_id'] ?? null),
        ];
    }

    public function dashboard(array $rawFilters): array
    {
        $filters = $this->normalizeFilters($rawFilters);
        [$reportWhere, $params] = $this->reportWhere($filters, 'r');
        [$clusterWhere, $clusterParams] = $this->clusterWhere($filters, 'c');

        $verification = $this->one(
            "SELECT
                COUNT(*) AS total,
                SUM(r.status = 'pending') AS pending,
                SUM(r.status = 'verified') AS verified,
                SUM(r.status = 'rejected') AS rejected,
                SUM(r.status = 'verified' AND EXISTS (
                    SELECT 1 FROM verification_logs vl WHERE vl.report_id = r.id AND vl.action = 'correct'
                )) AS corrected,
                ROUND(AVG(CASE WHEN r.status <> 'pending' AND r.verified_at IS NOT NULL
                    THEN TIMESTAMPDIFF(MINUTE, r.submitted_at, r.verified_at) / 60 END), 1) AS avg_turnaround_hours
             FROM reports r WHERE {$reportWhere}",
            $params
        );

        $healthRows = $this->all(
            "SELECT r.final_health AS label, COUNT(*) AS value
             FROM reports r
             WHERE {$reportWhere} AND r.status = 'verified' AND r.final_health IS NOT NULL
             GROUP BY r.final_health
             ORDER BY FIELD(r.final_health, 'Healthy', 'Stressed', 'At Risk')",
            $params
        );
        $health = ['Healthy' => 0, 'Stressed' => 0, 'At Risk' => 0];
        foreach ($healthRows as $row) {
            if (array_key_exists((string) $row['label'], $health)) {
                $health[(string) $row['label']] = (int) $row['value'];
            }
        }

        // Latest verified report for each cluster is the only observation used for current survival.
        $survivalSql = "SELECT c.id, c.cluster_code, c.name, c.center_lat, c.center_lng, c.initial_seedlings,
                   c.latest_health, lr.rarity_level, b.name AS barangay_name,
                   s.common_name, s.scientific_name,
                   lr.id AS latest_report_id, lr.report_code, lr.observed_alive_count, lr.final_health,
                   lr.submitted_at,
                   CASE
                       WHEN c.initial_seedlings > 0 AND lr.observed_alive_count IS NOT NULL
                       THEN ROUND(LEAST(100, (lr.observed_alive_count / c.initial_seedlings) * 100), 1)
                       ELSE NULL
                   END AS survival_rate
            FROM mangrove_clusters c
            JOIN barangays b ON b.id = c.barangay_id
            LEFT JOIN reports lr ON lr.id = (
                SELECT r2.id FROM reports r2
                WHERE r2.cluster_id = c.id AND r2.status = 'verified'
                  AND r2.submitted_at >= :latest_from AND r2.submitted_at < DATE_ADD(:latest_to, INTERVAL 1 DAY)
                  " . ($filters['species_id'] !== null
                    ? 'AND r2.final_species_id = :latest_species_id'
                    : '') . "
                ORDER BY r2.submitted_at DESC, r2.id DESC LIMIT 1
            )
            LEFT JOIN mangrove_species s ON s.id = lr.final_species_id
            WHERE {$clusterWhere} AND lr.id IS NOT NULL
            ORDER BY b.name, c.name";
        $survivalParams = array_merge([
            'latest_from' => $filters['date_from'],
            'latest_to' => $filters['date_to'],
        ], $clusterParams);
        if ($filters['species_id'] !== null) {
            $survivalParams['latest_species_id'] = $filters['species_id'];
        }
        $clusters = $this->all($survivalSql, $survivalParams);

        $eligibleInitial = 0;
        $eligibleAlive = 0;
        foreach ($clusters as &$cluster) {
            $cluster['id'] = (int) $cluster['id'];
            $cluster['initial_seedlings'] = (int) $cluster['initial_seedlings'];
            $cluster['observed_alive_count'] = $cluster['observed_alive_count'] === null
                ? null : (int) $cluster['observed_alive_count'];
            $cluster['survival_rate'] = $cluster['survival_rate'] === null
                ? null : (float) $cluster['survival_rate'];
            if ($cluster['initial_seedlings'] > 0 && $cluster['observed_alive_count'] !== null) {
                $eligibleInitial += $cluster['initial_seedlings'];
                $eligibleAlive += min($cluster['initial_seedlings'], $cluster['observed_alive_count']);
            }
        }
        unset($cluster);
        $overallSurvival = $eligibleInitial > 0 ? round(($eligibleAlive / $eligibleInitial) * 100, 1) : null;

        $growth = $this->all(
            "SELECT DATE_FORMAT(r.submitted_at, '%Y-%m') AS month_key,
                    DATE_FORMAT(r.submitted_at, '%b %Y') AS month_label,
                    ROUND(AVG(CASE WHEN c.initial_seedlings > 0 AND r.observed_alive_count IS NOT NULL
                        THEN LEAST(100, (r.observed_alive_count / c.initial_seedlings) * 100) END), 1) AS survival_rate,
                    SUM(r.status = 'verified') AS verified_reports
             FROM reports r
             LEFT JOIN mangrove_clusters c ON c.id = r.cluster_id
             WHERE {$reportWhere} AND r.status = 'verified'
             GROUP BY DATE_FORMAT(r.submitted_at, '%Y-%m'), DATE_FORMAT(r.submitted_at, '%b %Y')
             ORDER BY month_key",
            $params
        );

        $highRisk = $this->all(
            "SELECT r.id, r.report_code, r.submitted_at, r.final_health, r.needs_attention,
                    r.observed_alive_count, c.id AS cluster_id, c.name AS cluster_name,
                    b.name AS barangay_name, s.common_name AS species_name
             FROM reports r
             JOIN barangays b ON b.id = r.barangay_id
             LEFT JOIN mangrove_clusters c ON c.id = r.cluster_id
             LEFT JOIN mangrove_species s ON s.id = r.final_species_id
             WHERE {$reportWhere} AND r.status = 'verified'
               AND (r.final_health = 'At Risk' OR r.needs_attention = 1)
             ORDER BY r.needs_attention DESC, r.submitted_at DESC LIMIT 25",
            $params
        );
        $highRiskTotal = (int) ($this->one(
            "SELECT COUNT(*) AS total
             FROM reports r
             WHERE {$reportWhere} AND r.status = 'verified'
               AND (r.final_health = 'At Risk' OR r.needs_attention = 1)",
            $params
        )['total'] ?? 0);

        $total = (int) ($verification['total'] ?? 0);
        $reviewed = (int) ($verification['verified'] ?? 0) + (int) ($verification['rejected'] ?? 0);
        $verification['completion_rate'] = $total > 0 ? round(($reviewed / $total) * 100, 1) : 0.0;
        $verification['rejection_rate'] = $reviewed > 0
            ? round(((int) ($verification['rejected'] ?? 0) / $reviewed) * 100, 1) : 0.0;
        $verification['correction_rate'] = (int) ($verification['verified'] ?? 0) > 0
            ? round(((int) ($verification['corrected'] ?? 0) / (int) $verification['verified']) * 100, 1) : 0.0;

        return [
            'filters' => $filters,
            'verification' => $verification,
            'health' => $health,
            'clusters' => $clusters,
            'overall_survival' => $overallSurvival,
            'survival_eligible_clusters' => count(array_filter($clusters, static fn (array $row): bool => $row['survival_rate'] !== null)),
            'growth' => $growth,
            'high_risk' => $highRisk,
            'high_risk_total' => $highRiskTotal,
            'map' => array_map(static fn (array $row): array => [
                'id' => $row['id'],
                'code' => $row['cluster_code'],
                'name' => $row['name'],
                'barangay' => $row['barangay_name'],
                'lat' => (float) $row['center_lat'],
                'lng' => (float) $row['center_lng'],
                'health' => $row['final_health'] ?: $row['latest_health'],
                'rarity' => $row['rarity_level'],
                'species' => $row['common_name'] ?: $row['scientific_name'],
                'survival' => $row['survival_rate'],
            ], $clusters),
        ];
    }

    private function reportWhere(array $filters, string $alias): array
    {
        $clauses = ["{$alias}.submitted_at >= :date_from", "{$alias}.submitted_at < DATE_ADD(:date_to, INTERVAL 1 DAY)"];
        $params = ['date_from' => $filters['date_from'], 'date_to' => $filters['date_to']];
        if ($filters['barangay_id'] !== null) {
            $clauses[] = "{$alias}.barangay_id = :barangay_id";
            $params['barangay_id'] = $filters['barangay_id'];
        }
        if ($filters['species_id'] !== null) {
            $clauses[] = "(({$alias}.status = 'verified' AND {$alias}.final_species_id = :species_id)
                OR ({$alias}.status = 'pending' AND {$alias}.suggested_species_id = :pending_species_id))";
            $params['species_id'] = $filters['species_id'];
            $params['pending_species_id'] = $filters['species_id'];
        }
        return [implode(' AND ', $clauses), $params];
    }

    private function clusterWhere(array $filters, string $alias): array
    {
        $clauses = ['1 = 1'];
        $params = [];
        if ($filters['barangay_id'] !== null) {
            $clauses[] = "{$alias}.barangay_id = :cluster_barangay_id";
            $params['cluster_barangay_id'] = $filters['barangay_id'];
        }
        return [implode(' AND ', $clauses), $params];
    }

    private function validDate(string $value): ?DateTimeImmutable
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $date && $date->format('Y-m-d') === $value ? $date : null;
    }

    private function positiveInt(mixed $value): ?int
    {
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
    }

    private function one(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetch() ?: [];
    }

    private function all(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll();
    }
}
