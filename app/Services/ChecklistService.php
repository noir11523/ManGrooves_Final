<?php
declare(strict_types=1);

namespace App\Services;

use InvalidArgumentException;
use PDO;

final class ChecklistService
{
    public function __construct(private readonly PDO $pdo) {}

    public function data(): array
    {
        $criteria = (new HealthClassifier($this->pdo))->criteriaWithOptions();
        foreach ($criteria as &$criterion) {
            $criterion['version'] = hash('sha256', json_encode($criterion));
        }
        return $criteria;
    }

    public function save(array $user, array $input, array $files = []): void
    {
        if (($user['role'] ?? '') !== 'system_admin') {
            throw new InvalidArgumentException('Administrator access is required.');
        }
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
        $created = [];
        $uploads = new UploadService();
        try {
            \Database::transaction(function (PDO $pdo) use ($id, $input, $files, $user, $uploads, &$created): void {
                $lock = $pdo->prepare('SELECT id FROM health_criteria WHERE id = ? FOR UPDATE');
                $lock->execute([$id ?: 0]);
                if (!$lock->fetchColumn()) throw new InvalidArgumentException('Checklist not found.');
                $matches = array_values(array_filter($this->data(), static fn ($row) => $row['id'] === $id));
                $current = $matches[0] ?? null;
                if (!$current || !hash_equals($current['version'], \scalar_string($input['version'] ?? null))) {
                    throw new InvalidArgumentException('This checklist changed. Reload it before saving.');
                }
                $name = $this->text($input['name'] ?? null, 120, 'Enter a checklist name.');
                $question = $this->text($input['question_text'] ?? null, 255, 'Enter a short question.');
                $submitted = $input['options'] ?? null;
                if (!is_array($submitted) || count($submitted) > 60) {
                    throw new InvalidArgumentException('Use up to 30 choices per checklist.');
                }
                $existingById = array_column($current['options'], null, 'id');
                $seen = [];
                $codes = [];
                $removed = [];
                $changes = [];
                $normalPoints = [];
                $health = in_array($current['code'], HealthClassifier::HEALTH_CODES, true);
                $specialCodes = ['unknown', 'none_of_the_above', 'all_of_the_above'];
                foreach ($submitted as $option) {
                    if (!is_array($option)) throw new InvalidArgumentException('Invalid choice.');
                    $optionId = filter_var($option['id'] ?? null, FILTER_VALIDATE_INT);
                    if ($optionId === false || $optionId === 0 || isset($seen[$optionId])) {
                        throw new InvalidArgumentException('Invalid or duplicate choice. Reload the checklist.');
                    }
                    $seen[$optionId] = true;
                    $existing = $existingById[$optionId] ?? null;
                    if ($optionId > 0 && !$existing) throw new InvalidArgumentException('This choice is unavailable. Reload the checklist.');
                    if (in_array($option['delete'] ?? false, [true, 1, '1'], true)) {
                        if ($existing) $removed[] = $optionId;
                        continue;
                    }
                    $kind = \scalar_string($option['kind'] ?? 'standard');
                    if (!$existing && !in_array($kind, ['standard', ...$specialCodes], true)) {
                        throw new InvalidArgumentException('Choose a valid answer type.');
                    }
                    $code = $existing['code'] ?? ($kind === 'standard' ? 'custom_' . bin2hex(random_bytes(12)) : $kind);
                    if ($code === 'none_of_the_above' && $current['selection_mode'] !== 'multiple') {
                        throw new InvalidArgumentException('None of the above is available in multiple-answer checks.');
                    }
                    if (isset($codes[$code])) throw new InvalidArgumentException('Keep only one choice of each automatic type.');
                    $codes[$code] = true;
                    $reserved = in_array($code, $specialCodes, true);
                    $label = $this->text($option['label'] ?? null, 190, 'Enter a choice label.');
                    $points = filter_var($option['points'] ?? null, FILTER_VALIDATE_INT);
                    if ($points === false || ($reserved && $points !== 0)
                        || (!$reserved && ($points < ($health ? 0 : -2) || $points > 2))) {
                        throw new InvalidArgumentException($health ? 'Use 0, 1, or 2 points. Automatic choices keep their scoring rule.' : 'Use points from -2 to 2. Automatic choices keep their scoring rule.');
                    }
                    if (!$reserved) $normalPoints[] = $points;
                    $changes[] = ['id' => $existing['id'] ?? null, 'code' => $code, 'label' => $label, 'points' => $points,
                        'image_path' => $this->image($existing['image_path'] ?? null, $option['remove_image'] ?? false, $files['option_image_' . $optionId] ?? null, $uploads, $created),
                        'display_order' => $existing['display_order'] ?? ($reserved ? match ($code) { 'none_of_the_above' => 1000, 'all_of_the_above' => 1001, default => 1002 } : count($changes) + 1)];
                }
                foreach ($existingById as $optionId => $unused) {
                    if (!isset($seen[$optionId])) throw new InvalidArgumentException('A choice is missing. Reload the complete checklist.');
                }
                if (count($changes) > 30 || $normalPoints === []) {
                    throw new InvalidArgumentException('Keep at least one regular choice and no more than 30 choices.');
                }
                if ($health && (max($normalPoints) !== 2 || min($normalPoints) !== 0)) {
                    throw new InvalidArgumentException('Keep at least one 0-point and one 2-point answer in each health check.');
                }
                $guide = $this->image($current['guide_image'], $input['remove_guide'] ?? false, $files['guide_image'] ?? null, $uploads, $created);
                $pdo->prepare('UPDATE health_criteria SET name = ?, question_text = ?, guide_image = ? WHERE id = ?')->execute([$name, $question, $guide, $id]);
                $archive = $pdo->prepare('UPDATE health_options SET active = 0 WHERE id = ? AND criteria_id = ?');
                foreach ($removed as $optionId) $archive->execute([$optionId, $id]);
                $update = $pdo->prepare('UPDATE health_options SET label = ?, points = ?, image_path = ?, active = 1 WHERE id = ? AND criteria_id = ?');
                $find = $pdo->prepare('SELECT id FROM health_options WHERE criteria_id = ? AND code = ? FOR UPDATE');
                $insert = $pdo->prepare('INSERT INTO health_options (criteria_id, code, label, points, image_path, display_order) VALUES (?, ?, ?, ?, ?, ?)');
                foreach ($changes as &$option) {
                    if ($option['id'] === null) {
                        // Re-adding an automatic type restores its archived row, keeping old links intact.
                        $find->execute([$id, $option['code']]);
                        $restoredId = $find->fetchColumn();
                        if ($restoredId !== false) $option['id'] = (int) $restoredId;
                    }
                    if ($option['id'] !== null) {
                        $update->execute([$option['label'], $option['points'], $option['image_path'], $option['id'], $id]);
                    } else {
                        $insert->execute([$id, $option['code'], $option['label'], $option['points'], $option['image_path'], $option['display_order']]);
                        $option['id'] = (int) $pdo->lastInsertId();
                    }
                }
                unset($option);
                \Audit::logRequired('admin.checklist_updated', 'health_criteria', $id, [
                    'before' => $current, 'after' => ['name' => $name, 'question_text' => $question, 'guide_image' => $guide, 'options' => $changes, 'removed_choice_ids' => $removed],
                ], (int) $user['id']);
            });
        } catch (\Throwable $error) {
            foreach ($created as $path) $uploads->removeStoredPhoto($path);
            throw $error;
        }
    }

    private function text(mixed $value, int $max, string $message): string
    {
        $text = trim(\scalar_string($value));
        if ($text === '' || mb_strlen($text) > $max) throw new InvalidArgumentException($message . ' Maximum ' . $max . ' characters.');
        return $text;
    }

    private function image(?string $existing, mixed $remove, ?array $file, UploadService $uploads, array &$created): ?string
    {
        if ($file && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $stored = $uploads->storeChecklistImage($file);
            $created[] = $stored['absolute_path'];
            return $stored['path'];
        }
        return in_array($remove, [true, 1, '1'], true) ? null : $existing;
    }
}
