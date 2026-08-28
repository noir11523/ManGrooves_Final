<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

$currentUser = Auth::requireRoles('system_admin');
$pdo = Database::connection();
$metrics = [
    'verified_reports' => 'Verified reports',
    'verified_followups' => 'Verified follow-ups',
    'distinct_species' => 'Distinct species',
    'uncorrected_reports' => 'Uncorrected reports',
    'steward_days' => 'Stewardship days',
];

if (is_post()) {
    Csrf::validateOrFail();
    $action = scalar_string($_POST['action'] ?? null, 'save');
    $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT) ?: null;
    try {
        if ($action === 'delete') {
            if (!$id) {
                throw new InvalidArgumentException('Select a valid badge.');
            }
            Database::transaction(static function (PDO $pdo) use ($id): void {
                $lock = $pdo->prepare('SELECT id FROM badges WHERE id = :id LIMIT 1 FOR UPDATE');
                $lock->execute(['id' => $id]);
                if (!$lock->fetchColumn()) {
                    throw new DomainException('The badge no longer exists.');
                }
                $earned = $pdo->prepare('SELECT COUNT(*) FROM user_badges WHERE badge_id = :id');
                $earned->execute(['id' => $id]);
                if ((int) $earned->fetchColumn() > 0) {
                    throw new DomainException('An earned badge cannot be deleted. Mark it inactive to preserve guardian achievements.');
                }
                $delete = $pdo->prepare('DELETE FROM badges WHERE id = :id');
                $delete->execute(['id' => $id]);
                Audit::logRequired('admin.badge_deleted', 'badge', $id);
            });
            flash('success', 'Badge deleted.');
            redirect('admin/badges.php');
        }

        $code = strtoupper(trim(scalar_string($_POST['code'] ?? null)));
        $name = trim(scalar_string($_POST['badge_name'] ?? null));
        $metric = scalar_string($_POST['metric'] ?? null);
        $target = filter_var($_POST['target_value'] ?? null, FILTER_VALIDATE_INT);
        $description = trim(scalar_string($_POST['description'] ?? null));
        if (!preg_match('/^[A-Z0-9_-]{2,60}$/', $code)) {
            throw new InvalidArgumentException('Badge code must use 2-60 uppercase letters, numbers, underscores, or hyphens.');
        }
        if ($name === '' || mb_strlen($name) > 120 || $description === '' || mb_strlen($description) > 255) {
            throw new InvalidArgumentException('Enter a badge name and a description of at most 255 characters.');
        }
        if (!array_key_exists($metric, $metrics) || $target === false || $target < 1) {
            throw new InvalidArgumentException('Choose a valid metric and a target of at least one.');
        }
        $data = [
            'code' => $code,
            'badge_name' => $name,
            'metric' => $metric,
            'target_value' => (int) $target,
            'description' => $description,
            'image_path' => ($imagePath = trim(scalar_string($_POST['image_path'] ?? null))) === '' ? null : mb_substr($imagePath, 0, 255),
            'active' => scalar_string($_POST['active'] ?? null) === '1' ? 1 : 0,
        ];
        if ($id) {
            $data['id'] = $id;
            $update = $pdo->prepare(
                'UPDATE badges SET code = :code, badge_name = :badge_name, metric = :metric,
                    target_value = :target_value, description = :description, image_path = :image_path,
                    active = :active WHERE id = :id'
            );
            $update->execute($data);
            Audit::log('admin.badge_updated', 'badge', $id);
            flash('success', 'Badge updated.');
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO badges (code, badge_name, metric, target_value, description, image_path, active)
                 VALUES (:code, :badge_name, :metric, :target_value, :description, :image_path, :active)'
            );
            $insert->execute($data);
            $id = (int) $pdo->lastInsertId();
            Audit::log('admin.badge_created', 'badge', $id);
            flash('success', 'Badge created.');
        }
        if ($data['active'] === 1) {
            flash('info', 'Eligible guardians receive this badge on their next badge-page visit or scheduled badge-evaluator run.');
        }
    } catch (InvalidArgumentException|DomainException $exception) {
        flash('danger', $exception->getMessage());
        remember_old_input($_POST);
        redirect('admin/badges.php' . ($id ? '?edit=' . $id : ''));
    } catch (PDOException $exception) {
        flash('danger', $exception->getCode() === '23000' ? 'That badge code already exists.' : 'The badge could not be saved.');
        remember_old_input($_POST);
        redirect('admin/badges.php' . ($id ? '?edit=' . $id : ''));
    }
    redirect('admin/badges.php');
}

$editId = filter_var($_GET['edit'] ?? null, FILTER_VALIDATE_INT) ?: null;
$editing = null;
if ($editId) {
    $editStatement = $pdo->prepare('SELECT * FROM badges WHERE id = :id LIMIT 1');
    $editStatement->execute(['id' => $editId]);
    $editing = $editStatement->fetch() ?: null;
}
$statement = $pdo->query(
    'SELECT b.*, COALESCE(earned.earned_count, 0) AS earned_count
     FROM badges b
     LEFT JOIN (
         SELECT badge_id, COUNT(*) AS earned_count
         FROM user_badges
         GROUP BY badge_id
     ) earned ON earned.badge_id = b.id
     ORDER BY b.active DESC, b.target_value, b.badge_name'
);

render('admin/badges', [
    'pageTitle' => 'Badge management',
    'currentUser' => $currentUser,
    'badges' => $statement->fetchAll(),
    'editing' => $editing,
    'metrics' => $metrics,
]);
