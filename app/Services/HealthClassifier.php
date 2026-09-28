<?php

declare(strict_types=1);

namespace App\Services;

use InvalidArgumentException;
use PDO;

/**
 * Calculates the canonical mangrove health result from the workbook rules.
 *
 * Only leaf_color, pests and roots can influence the six-point health score.
 * Context and environmental observations are returned separately so adding a
 * new checklist row can never silently change the classification thresholds.
 */
final class HealthClassifier
{
    public const HEALTH_CODES = ['leaf_color', 'pests', 'roots'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @param array<string, array<int|string>|int|string> $selections criterion code => option id(s)
     * @return array{
     *   status:string,
     *   health_score:?int,
     *   health_max_score:int,
     *   context_score:int,
     *   environmental_score:int,
     *   observations:list<array<string,mixed>>
     * }
     */
    public function classify(array $selections): array
    {
        $criteria = $this->criteriaWithOptions();
        $healthCriteria = array_filter($criteria, static fn (array $item): bool => in_array($item['code'], self::HEALTH_CODES, true));
        if (count($healthCriteria) !== count(self::HEALTH_CODES)) {
            throw new InvalidArgumentException('The health checklist is incomplete. Please contact an administrator.');
        }
        $observations = [];
        $healthScore = 0;
        $contextScore = 0;
        $environmentalScore = 0;
        $selectedCodes = [];
        $breakdown = [];
        $hasUnknown = false;

        foreach ($criteria as $criterion) {
            $code = (string) $criterion['code'];
            $raw = $selections[$code] ?? [];
            $ids = is_array($raw) ? $raw : [$raw];
            $ids = array_values(array_unique(array_filter(
                array_map(static fn (mixed $value): int => is_scalar($value) ? (int) $value : 0, $ids),
                static fn (int $value): bool => $value > 0
            )));

            if ($criterion['selection_mode'] === 'single' && count($ids) !== 1) {
                throw new InvalidArgumentException('Choose one answer for ' . $criterion['name'] . '.');
            }

            $allowed = [];
            foreach ($criterion['options'] as $option) {
                $allowed[(int) $option['id']] = $option;
            }

            foreach ($ids as $id) {
                if (!isset($allowed[$id])) {
                    throw new InvalidArgumentException('An answer selected for ' . $criterion['name'] . ' is not valid.');
                }
                $option = $allowed[$id];
                $points = (int) $option['points'];
                $optionCode = (string) $option['code'];
                if (in_array($optionCode, ['none_of_the_above', 'all_of_the_above', 'unknown'], true)) {
                    if (($optionCode === 'none_of_the_above' && $criterion['selection_mode'] !== 'multiple') || count($ids) !== 1) {
                        throw new InvalidArgumentException('Choose ' . $option['label'] . ' on its own for ' . $criterion['name'] . '.');
                    }
                    $points = 0;
                    if ($optionCode === 'unknown') $hasUnknown = true;
                    if ($optionCode === 'all_of_the_above') {
                        $includedPoints = [];
                        foreach ($allowed as $included) {
                            if (!in_array($included['code'], ['none_of_the_above', 'all_of_the_above', 'unknown'], true)) {
                                $includedPoints[] = (int) $included['points'];
                                $points += (int) $included['points'];
                                $selectedCodes[$code][] = (string) $included['code'];
                            }
                        }
                        if (in_array($code, self::HEALTH_CODES, true)) {
                            $points = $includedPoints === [] ? 0 : min($includedPoints);
                        }
                    }
                } else {
                    $selectedCodes[$code][] = $optionCode;
                }
                $observation = [
                    'criteria_id' => (int) $criterion['id'],
                    'criteria_code' => $code,
                    'criteria_name' => (string) $criterion['name'],
                    'criteria_order' => (int) $criterion['display_order'],
                    'selection_mode' => (string) $criterion['selection_mode'],
                    'score_group' => (string) $criterion['score_group'],
                    'option_id' => $id,
                    'option_code' => (string) $option['code'],
                    'option_label' => (string) $option['label'],
                    'option_order' => (int) $option['display_order'],
                    'points' => $points,
                ];
                $observations[] = $observation;

                if (in_array($code, self::HEALTH_CODES, true)) {
                    if ($criterion['selection_mode'] !== 'single' || $points < 0 || $points > 2) {
                        throw new InvalidArgumentException('The health scoring settings need an administrator check.');
                    }
                    $healthScore += $points;
                    $breakdown[] = ['name' => $criterion['name'], 'answer' => $option['label'], 'points' => $optionCode === 'unknown' ? null : $points, 'max_points' => 2];
                } elseif ($criterion['score_group'] === 'environment') {
                    $environmentalScore += $points;
                } else {
                    $contextScore += $points;
                }
            }
        }

        if (
            in_array('no_animals', $selectedCodes['negative_signs'] ?? [], true)
            && !empty($selectedCodes['bio_indicators'])
        ) {
            throw new InvalidArgumentException('“No Animals at All” cannot be selected when an animal bio-indicator is also selected.');
        }

        // These exact thresholds are the canonical rules supplied for ManGROOVES.
        $status = $hasUnknown ? 'Unknown' : ($healthScore >= 6 ? 'Healthy' : ($healthScore >= 3 ? 'Stressed' : 'At Risk'));

        return [
            'status' => $status,
            'health_score' => $hasUnknown ? null : $healthScore,
            'needs_review' => $hasUnknown,
            'message' => $hasUnknown ? 'Some answers are unknown. An expert will review this report.' : null,
            'health_max_score' => 6,
            'context_score' => $contextScore,
            'environmental_score' => $environmentalScore,
            'breakdown' => $breakdown,
            'guide' => '6 Healthy · 3–5 Stressed · 0–2 At Risk',
            'observations' => $observations,
        ];
    }

    /** @return list<array<string,mixed>> */
    public function criteriaWithOptions(): array
    {
        $statement = $this->pdo->query(
            "SELECT c.id AS criteria_id, c.code AS criteria_code, c.name AS criteria_name,
                    c.question_text, c.selection_mode, c.score_group, c.guide_image,
                    c.display_order AS criteria_order,
                    o.id AS option_id, o.code AS option_code, o.label AS option_label,
                    o.points, o.image_path, o.display_order AS option_order
             FROM health_criteria c
             JOIN health_options o ON o.criteria_id = c.id AND o.active = 1
             WHERE c.active = 1
             ORDER BY c.display_order, c.id, o.display_order, o.id"
        );

        $grouped = [];
        foreach ($statement->fetchAll() as $row) {
            $id = (int) $row['criteria_id'];
            if (!isset($grouped[$id])) {
                $grouped[$id] = [
                    'id' => $id,
                    'code' => (string) $row['criteria_code'],
                    'name' => (string) $row['criteria_name'],
                    'question_text' => (string) $row['question_text'],
                    'selection_mode' => (string) $row['selection_mode'],
                    'score_group' => (string) $row['score_group'],
                    'guide_image' => $row['guide_image'],
                    'display_order' => (int) $row['criteria_order'],
                    'options' => [],
                ];
            }
            $grouped[$id]['options'][] = [
                'id' => (int) $row['option_id'],
                'code' => (string) $row['option_code'],
                'label' => (string) $row['option_label'],
                'points' => (int) $row['points'],
                'image_path' => $row['image_path'],
                'display_order' => (int) $row['option_order'],
            ];
        }

        return array_values($grouped);
    }
}
