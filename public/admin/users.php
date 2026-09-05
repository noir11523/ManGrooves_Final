<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

$currentUser = Auth::requireRoles('system_admin');
$pdo = Database::connection();
$roles = ['guardian', 'expert', 'system_admin'];
$statuses = ['active', 'suspended'];

if (is_post()) {
    Csrf::validateOrFail();
    $action = scalar_string($_POST['action'] ?? null);
    try {
        if ($action === 'create_staff') {
            $name = trim(scalar_string($_POST['full_name'] ?? null));
            $email = strtolower(trim(scalar_string($_POST['email'] ?? null)));
            $phone = trim(scalar_string($_POST['phone'] ?? null));
            $role = scalar_string($_POST['role'] ?? null);
            $password = scalar_string($_POST['password'] ?? null);
            $confirmation = scalar_string($_POST['password_confirmation'] ?? null);
            $staffRoles = ['expert', 'system_admin'];
            $errors = [];

            if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
                $errors[] = 'Enter a full name between 2 and 120 characters.';
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
                $errors[] = 'Enter a valid email address.';
            }
            if ($phone !== '' && !preg_match('/^[0-9+() .-]{7,30}$/', $phone)) {
                $errors[] = 'Enter a valid phone number or leave it blank.';
            }
            if (!in_array($role, $staffRoles, true)) {
                $errors[] = 'Choose Scientific Expert or System Administrator.';
            }
            if (strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) {
                $errors[] = 'Use a temporary password between 8 and 72 characters.';
            }
            if ($password !== $confirmation) {
                $errors[] = 'The password confirmation does not match.';
            }
            if ($errors !== []) {
                throw new InvalidArgumentException(implode(' ', $errors));
            }

            $successMessage = Database::transaction(static function (PDO $pdo) use (
                $name,
                $email,
                $phone,
                $role,
                $password
            ): string {
                $exists = $pdo->prepare('SELECT 1 FROM users WHERE email = :email LIMIT 1');
                $exists->execute(['email' => $email]);
                if ($exists->fetchColumn()) {
                    throw new DomainException('An account already uses that email address.');
                }

                $create = $pdo->prepare(
                    'INSERT INTO users (full_name, email, phone, password_hash, role, barangay_id, status, privacy_consent_at)
                     VALUES (:full_name, :email, :phone, :password_hash, :role, NULL, \'active\', NULL)'
                );
                $create->execute([
                    'full_name' => $name,
                    'email' => $email,
                    'phone' => $phone === '' ? null : $phone,
                    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                    'role' => $role,
                ]);
                $createdId = (int) $pdo->lastInsertId();
                Audit::logRequired('admin.user_created', 'user', $createdId, [
                    'role' => $role,
                    'email' => $email,
                ]);
                return 'Staff account created. Ask the staff member to change the temporary password after signing in.';
            });
            flash('success', $successMessage);
            redirect('admin/users.php');
        }

        $targetId = filter_var($_POST['user_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$targetId || $targetId < 1) {
            throw new InvalidArgumentException('Select a valid user.');
        }
        $successMessage = Database::transaction(static function (PDO $pdo) use (
            $targetId,
            $currentUser,
            $action,
            $roles,
            $statuses
        ): string {
            // Serialize privileged-account changes so concurrent requests cannot remove every active administrator.
            $activeAdminIds = array_map('intval', $pdo->query(
                "SELECT id FROM users WHERE role = 'system_admin' AND status = 'active' ORDER BY id FOR UPDATE"
            )->fetchAll(PDO::FETCH_COLUMN));

            $targetStatement = $pdo->prepare('SELECT id, full_name, role, status FROM users WHERE id = :id LIMIT 1 FOR UPDATE');
            $targetStatement->execute(['id' => $targetId]);
            $target = $targetStatement->fetch();
            if (!$target) {
                throw new DomainException('The user no longer exists.');
            }
            if ((int) $targetId === (int) $currentUser['id']) {
                throw new DomainException('You cannot change or delete your own administrator account.');
            }

            if ($action === 'update') {
                $role = scalar_string($_POST['role'] ?? null);
                $status = scalar_string($_POST['status'] ?? null);
                if (!in_array($role, $roles, true) || !in_array($status, $statuses, true)) {
                    throw new InvalidArgumentException('Choose a valid role and account status.');
                }
                $removesActiveAdmin = $target['role'] === 'system_admin' && $target['status'] === 'active'
                    && ($role !== 'system_admin' || $status !== 'active');
                if ($removesActiveAdmin && count(array_diff($activeAdminIds, [(int) $targetId])) < 1) {
                    throw new DomainException('At least one other active system administrator must remain.');
                }

                $update = $pdo->prepare(
                    'UPDATE users
                     SET role = :role, status = :status, session_version = session_version + 1
                     WHERE id = :id'
                );
                $update->execute(['role' => $role, 'status' => $status, 'id' => $targetId]);
                Audit::logRequired('admin.user_updated', 'user', (int) $targetId, [
                    'from' => ['role' => $target['role'], 'status' => $target['status']],
                    'to' => ['role' => $role, 'status' => $status],
                ]);
                return 'User role and status updated.';
            }

            if ($action === 'delete') {
                if ($target['status'] !== 'suspended') {
                    throw new DomainException('Suspend an unused account before deleting it.');
                }
                $removesActiveAdmin = $target['role'] === 'system_admin' && $target['status'] === 'active';
                if ($removesActiveAdmin && count(array_diff($activeAdminIds, [(int) $targetId])) < 1) {
                    throw new DomainException('The last active system administrator cannot be deleted.');
                }

                $dependencies = $pdo->prepare(
                    'SELECT
                        (SELECT COUNT(*) FROM reports WHERE user_id = :guardian_id) +
                        (SELECT COUNT(*) FROM reports WHERE expert_id = :expert_id) +
                        (SELECT COUNT(*) FROM verification_logs WHERE verifier_id = :verifier_id) +
                        (SELECT COUNT(*) FROM audit_logs WHERE user_id = :audit_user_id) AS activity_count'
                );
                $dependencies->execute([
                    'guardian_id' => $targetId,
                    'expert_id' => $targetId,
                    'verifier_id' => $targetId,
                    'audit_user_id' => $targetId,
                ]);
                if ((int) $dependencies->fetchColumn() > 0) {
                    throw new DomainException('Users with report, verification, or audit history cannot be deleted. Keep the account suspended instead.');
                }

                $delete = $pdo->prepare('DELETE FROM users WHERE id = :id');
                $delete->execute(['id' => $targetId]);
                Audit::logRequired('admin.user_deleted', 'user', (int) $targetId, [
                    'full_name' => $target['full_name'],
                    'role' => $target['role'],
                ]);
                return 'Unused user account deleted.';
            }

            throw new InvalidArgumentException('Unknown user management action.');
        });
        flash('success', $successMessage);
    } catch (InvalidArgumentException|DomainException $exception) {
        flash('danger', $exception->getMessage());
    } catch (PDOException $exception) {
        if ((bool) config('debug', false)) {
            error_log('User management failed: ' . $exception->getMessage());
        }
        flash('danger', 'The account could not be changed because related records still depend on it.');
    }
    redirect('admin/users.php?' . query_string(['page' => null]));
}

$rawRoleFilter = scalar_string($_GET['role'] ?? null);
$rawStatusFilter = scalar_string($_GET['status'] ?? null);
$roleFilter = in_array($rawRoleFilter, $roles, true) ? $rawRoleFilter : '';
$statusFilter = in_array($rawStatusFilter, $statuses, true) ? $rawStatusFilter : '';
$barangayFilter = filter_var($_GET['barangay_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
$search = mb_substr(trim(scalar_string($_GET['q'] ?? null)), 0, 100);
$page = max(1, (int) scalar_string($_GET['page'] ?? null, '1'));
$perPage = 25;
$offset = ($page - 1) * $perPage;
$clauses = ['1 = 1'];
$params = [];
if ($roleFilter !== '') {
    $clauses[] = 'u.role = :role';
    $params['role'] = $roleFilter;
}
if ($statusFilter !== '') {
    $clauses[] = 'u.status = :status';
    $params['status'] = $statusFilter;
}
if ($barangayFilter) {
    $clauses[] = 'u.barangay_id = :barangay_id';
    $params['barangay_id'] = $barangayFilter;
}
if ($search !== '') {
    $clauses[] = '(u.full_name LIKE :search_name OR u.email LIKE :search_email OR u.phone LIKE :search_phone)';
    $like = '%' . $search . '%';
    $params['search_name'] = $like;
    $params['search_email'] = $like;
    $params['search_phone'] = $like;
}
$where = implode(' AND ', $clauses);
$counter = $pdo->prepare("SELECT COUNT(*) FROM users u WHERE {$where}");
$counter->execute($params);
$total = (int) $counter->fetchColumn();
$statement = $pdo->prepare(
    "SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.last_login_at, u.created_at,
            b.name AS barangay_name,
            (SELECT COUNT(*) FROM reports r WHERE r.user_id = u.id) AS report_count,
            (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) AS badge_count
     FROM users u LEFT JOIN barangays b ON b.id = u.barangay_id
     WHERE {$where} ORDER BY u.created_at DESC, u.id DESC LIMIT :limit OFFSET :offset"
);
foreach ($params as $key => $value) {
    $statement->bindValue(':' . $key, $value);
}
$statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
$statement->bindValue(':offset', $offset, PDO::PARAM_INT);
$statement->execute();
$users = $statement->fetchAll();
$barangays = $pdo->query('SELECT id, name FROM barangays ORDER BY name')->fetchAll();

render('admin/users', [
    'pageTitle' => 'User management',
    'currentUser' => $currentUser,
    'users' => $users,
    'roles' => $roles,
    'statuses' => $statuses,
    'barangays' => $barangays,
    'roleFilter' => $roleFilter,
    'statusFilter' => $statusFilter,
    'barangayFilter' => $barangayFilter,
    'search' => $search,
    'page' => $page,
    'totalPages' => max(1, (int) ceil($total / $perPage)),
    'total' => $total,
]);
