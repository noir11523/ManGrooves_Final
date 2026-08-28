<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

/** Ranked trait matching that tolerates punctuation and wording differences. */
final class SpeciesMatcher
{
    private const TRAITS = ['root_type', 'leaf_shape', 'bark_texture'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @param array{root_type?:string,leaf_shape?:string,bark_texture?:string} $traits
     * @return array{best:?array<string,mixed>,ranked:list<array<string,mixed>>}
     */
    public function match(array $traits, int $limit = 5): array
    {
        $limit = max(1, min(20, $limit));
        $species = $this->pdo->query(
            'SELECT id, scientific_name, common_name, local_name, family, iucn_code, iucn_label,
                    population_trend, root_type, leaf_shape, bark_texture
             FROM mangrove_species WHERE active = 1 ORDER BY scientific_name'
        )->fetchAll();

        $ranked = [];
        foreach ($species as $candidate) {
            $traitScores = [];
            foreach (self::TRAITS as $trait) {
                $traitScores[$trait] = $this->similarity(
                    (string) ($traits[$trait] ?? ''),
                    (string) ($candidate[$trait] ?? '')
                );
            }
            $score = array_sum($traitScores) / count(self::TRAITS);
            $candidate['confidence'] = round($score * 100, 2);
            $candidate['trait_scores'] = array_map(
                static fn (float $value): float => round($value * 100, 2),
                $traitScores
            );
            $ranked[] = $candidate;
        }

        usort($ranked, static function (array $left, array $right): int {
            $byConfidence = $right['confidence'] <=> $left['confidence'];
            return $byConfidence !== 0
                ? $byConfidence
                : strcasecmp((string) $left['scientific_name'], (string) $right['scientific_name']);
        });
        $ranked = array_slice($ranked, 0, $limit);

        // A low-confidence suggestion is still useful in the ranked preview but
        // is not persisted as an automated identification.
        $best = $ranked[0] ?? null;
        if ($best !== null && (float) $best['confidence'] < 45.0) {
            $best = null;
        }

        return ['best' => $best, 'ranked' => $ranked];
    }

    public static function normalize(string $value): string
    {
        $value = trim(mb_strtolower($value, 'UTF-8'));
        if (function_exists('transliterator_transliterate')) {
            $transliterated = transliterator_transliterate('Any-Latin; Latin-ASCII', $value);
            if (is_string($transliterated)) {
                $value = $transliterated;
            }
        }
        $value = preg_replace('/[^a-z0-9]+/u', ' ', $value) ?? '';
        $tokens = preg_split('/\s+/', trim($value), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $stopWords = ['a', 'an', 'and', 'or', 'the', 'to', 'with', 'like', 'of', 'n', 'na'];
        $tokens = array_values(array_filter($tokens, static fn (string $token): bool => !in_array($token, $stopWords, true)));
        sort($tokens, SORT_STRING);
        return implode(' ', array_unique($tokens));
    }

    private function similarity(string $observed, string $reference): float
    {
        $left = self::normalize($observed);
        $right = self::normalize($reference);
        if ($left === '' || $right === '') {
            return 0.0;
        }
        if ($left === $right) {
            return 1.0;
        }

        $leftTokens = array_values(array_unique(explode(' ', $left)));
        $rightTokens = array_values(array_unique(explode(' ', $right)));
        $intersection = count(array_intersect($leftTokens, $rightTokens));
        $union = count(array_unique(array_merge($leftTokens, $rightTokens)));
        $jaccard = $union > 0 ? $intersection / $union : 0.0;

        similar_text($left, $right, $characterPercent);
        $character = $characterPercent / 100;
        $contains = (str_contains($left, $right) || str_contains($right, $left)) ? 0.9 : 0.0;
        return min(1.0, max($contains, ($jaccard * 0.7) + ($character * 0.3)));
    }
}
