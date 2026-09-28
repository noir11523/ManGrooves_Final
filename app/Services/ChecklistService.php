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
                if (!is_array($submitted) || count($submitted) !== count($current['options'])) {
                    throw new InvalidArgumentException('Reload the complete list of choices.');
                }
                $options = [];
                foreach ($submitted as $option) {
                    if (!is_array($option)) throw new InvalidArgumentException('Invalid choice.');
                    $optionId = (int) ($option['id'] ?? 0);
                    if (isset($options[$optionId])) throw new InvalidArgumentException('Duplicate choice.');
                    $options[$optionId] = $option;
                }
                $health = in_array($current['code'], HealthClassifier::HEALTH_CODES, true);
                $normalPoints = [];
                $changes = [];
                foreach ($current['options'] as $existing) {
                    $option = $options[$existing['id']] ?? null;
                    if (!$option) throw new InvalidArgumentException('A choice is missing. Reload the checklist.');
                    $reserved = in_array($existing['code'], ['unknown', 'none_of_the_above', 'all_of_the_above'], true);
                    $label = $reserved ? $existing['label'] : $this->text($option['label'] ?? null, 190, 'Enter a choice label.');
                    $points = filter_var($option['points'] ?? null, FILTER_VALIDATE_INT);
                    if ($points === false || ($reserved && $points !== 0)
                        || (!$reserved && ($points < ($health ? 0 : -2) || $points > 2))) {
                        throw new InvalidArgumentException($health ? 'Use 0, 1, or 2 points. Unknown is unscored.' : 'Use points from -2 to 2. Special choices stay at 0.');
                    }
                    if (!$reserved) $normalPoints[] = $points;
                    $changes[] = ['id' => $existing['id'], 'label' => $label, 'points' => $points,
                        'image_path' => $this->image($existing['image_path'], $option['remove_image'] ?? false, $files['option_image_' . $existing['id']] ?? null, $uploads, $created)];
                }
                if ($health && ($normalPoints === [] || max($normalPoints) !== 2 || min($normalPoints) !== 0)) {
                    throw new InvalidArgumentException('Keep at least one 0-point and one 2-point answer in each health check.');
                }
                $guide = $this->image($current['guide_image'], $input['remove_guide'] ?? false, $files['guide_image'] ?? null, $uploads, $created);
                $pdo->prepare('UPDATE health_criteria SET name = ?, question_text = ?, guide_image = ? WHERE id = ?')->execute([$name, $question, $guide, $id]);
                $update = $pdo->prepare('UPDATE health_options SET label = ?, points = ?, image_path = ? WHERE id = ? AND criteria_id = ?');
                foreach ($changes as $option) $update->execute([$option['label'], $option['points'], $option['image_path'], $option['id'], $id]);
                \Audit::logRequired('admin.checklist_updated', 'health_criteria', $id, [
                    'before' => $current, 'after' => ['name' => $name, 'question_text' => $question, 'guide_image' => $guide, 'options' => $changes],
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
