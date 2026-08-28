<?php

declare(strict_types=1);

final class Auth
{
    private static ?array $cachedUser = null;
    private static bool $loaded = false;

    public static function user(): ?array
    {
        if (self::$loaded) {
            return self::$cachedUser;
        }
        self::$loaded = true;

        $id = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) {
            return null;
        }

        $statement = Database::connection()->prepare(
            'SELECT u.*, b.name AS barangay_name
             FROM users u LEFT JOIN barangays b ON b.id = u.barangay_id
             WHERE u.id = :id LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $user = $statement->fetch();

        $sessionVersion = filter_var($_SESSION['session_version'] ?? null, FILTER_VALIDATE_INT);
        if (!$user || $user['status'] !== 'active' || $sessionVersion === false
            || (int) $user['session_version'] !== (int) $sessionVersion) {
            unset($_SESSION['user_id'], $_SESSION['session_version'], $_SESSION['last_activity']);
            return null;
        }

        self::$cachedUser = $user;
        return self::$cachedUser;
    }

    public static function check(): bool
    {
        return self::user() !== null;
    }

    public static function id(): ?int
    {
        return self::user() ? (int) self::user()['id'] : null;
    }

    public static function role(): ?string
    {
        return self::user()['role'] ?? null;
    }

    public static function hasRole(string ...$roles): bool
    {
        return in_array(self::role(), $roles, true);
    }

    public static function requireLogin(): array
    {
        $user = self::user();
        if (!$user) {
            flash('warning', 'Please sign in to continue.');
            redirect('login.php');
        }
        return $user;
    }

    public static function requireRoles(string ...$roles): array
    {
        $user = self::requireLogin();
        if (!in_array($user['role'], $roles, true)) {
            Audit::log('access.denied', 'route', null, ['required_roles' => $roles]);
            http_response_code(403);
            render('errors/403', ['pageTitle' => 'Access denied']);
            exit;
        }
        return $user;
    }

    public static function attempt(string $email, string $password): array
    {
        $email = strtolower(trim($email));
        if (strlen($password) > 72 || str_contains($password, "\0")) {
            return [false, 'The email or password is incorrect.'];
        }
        $pdo = Database::connection();

        $limit = $pdo->prepare(
            "SELECT
                (SELECT COUNT(*) FROM login_attempts
                 WHERE email = :email AND ip_address = :email_ip_address AND was_successful = 0
                   AND attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)) AS email_failures,
                (SELECT COUNT(*) FROM login_attempts
                 WHERE ip_address = :ip_address AND was_successful = 0
                   AND attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)) AS ip_failures"
        );
        $limit->execute([
            'email' => $email,
            'email_ip_address' => client_ip(),
            'ip_address' => client_ip(),
        ]);
        $recent = $limit->fetch() ?: [];
        if ((int) ($recent['email_failures'] ?? 0) >= 5 || (int) ($recent['ip_failures'] ?? 0) >= 25) {
            return [false, 'Too many failed attempts. Please wait 15 minutes before trying again.'];
        }

        $statement = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();
        $passwordValid = $user && password_verify($password, (string) $user['password_hash']);

        if (!$passwordValid) {
            $attempt = $pdo->prepare(
                'INSERT INTO login_attempts (email, ip_address, was_successful) VALUES (:email, :ip, 0)'
            );
            $attempt->execute(['email' => $email, 'ip' => client_ip()]);
            Audit::log('auth.login_failed', 'user', null, ['email' => $email], null);
            return [false, 'The email or password is incorrect.'];
        }
        if ($user['status'] !== 'active') {
            $attempt = $pdo->prepare(
                'INSERT INTO login_attempts (email, ip_address, was_successful) VALUES (:email, :ip, 0)'
            );
            $attempt->execute(['email' => $email, 'ip' => client_ip()]);
            Audit::log('auth.login_blocked', 'user', (int) $user['id'], ['status' => $user['status']], null);
            return [false, 'This account is suspended. Contact a system administrator.'];
        }

        if (password_needs_rehash((string) $user['password_hash'], PASSWORD_DEFAULT)) {
            $refreshedUser = self::rehashPasswordSafely($pdo, $user, $email, $password);
            if ($refreshedUser === null) {
                $pdo->prepare(
                    'INSERT INTO login_attempts (email, ip_address, was_successful) VALUES (:email, :ip, 0)'
                )->execute(['email' => $email, 'ip' => client_ip()]);
                Audit::log('auth.login_failed', 'user', (int) $user['id'], [
                    'email' => $email,
                    'reason' => 'credentials_changed_during_login',
                ], null);
                return [false, 'The email or password is incorrect.'];
            }
            $user = $refreshedUser;
        }

        $pdo->prepare(
            'INSERT INTO login_attempts (email, ip_address, was_successful) VALUES (:email, :ip, 1)'
        )->execute(['email' => $email, 'ip' => client_ip()]);
        $pdo->prepare('DELETE FROM login_attempts WHERE email = :email AND was_successful = 0')
            ->execute(['email' => $email]);

        if (!headers_sent()) {
            session_regenerate_id(true);
        }
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['session_version'] = (int) $user['session_version'];
        $_SESSION['last_activity'] = time();
        self::forgetUser();
        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id')->execute(['id' => $user['id']]);
        Audit::log('auth.login', 'user', (int) $user['id'], [], (int) $user['id']);
        return [true, null];
    }

    public static function registerGuardian(array $data): array
    {
        $pdo = Database::connection();
        $registrationIp = client_ip();
        $registrationLimit = $pdo->prepare(
            'SELECT COUNT(*) FROM registration_attempts
             WHERE ip_address = :ip_address
               AND attempted_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'
        );
        $registrationLimit->execute(['ip_address' => $registrationIp]);
        if ((int) $registrationLimit->fetchColumn() >= (int) config('registration_attempt_limit_per_hour', 10)) {
            return [false, ['Too many registration attempts. Please wait one hour before trying again.']];
        }
        $registrationAttempt = $pdo->prepare(
            'INSERT INTO registration_attempts (ip_address, was_successful) VALUES (:ip_address, 0)'
        );
        $registrationAttempt->execute(['ip_address' => $registrationIp]);
        $registrationAttemptId = (int) $pdo->lastInsertId();

        $name = trim(\scalar_string($data['full_name'] ?? null));
        $email = strtolower(trim(\scalar_string($data['email'] ?? null)));
        $phone = trim(\scalar_string($data['phone'] ?? null));
        $barangayId = filter_var($data['barangay_id'] ?? null, FILTER_VALIDATE_INT);
        $password = \scalar_string($data['password'] ?? null);
        $confirmation = \scalar_string($data['password_confirmation'] ?? null);
        $privacyConsent = \scalar_string($data['privacy_consent'] ?? null);
        $errors = [];

        if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
            $errors[] = 'Enter a full name between 2 and 120 characters.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors[] = 'Enter a valid email address.';
        }
        if (strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) {
            $errors[] = 'Use a password between 8 and 72 characters.';
        }
        if ($password !== $confirmation) {
            $errors[] = 'The password confirmation does not match.';
        }
        if (!$barangayId) {
            $errors[] = 'Select your barangay.';
        }
        if (!in_array($privacyConsent, ['1', 'on', 'yes'], true)) {
            $errors[] = 'Privacy consent is required to create an account.';
        }
        if ($phone !== '' && !preg_match('/^[0-9+() .-]{7,30}$/', $phone)) {
            $errors[] = 'Enter a valid phone number or leave it blank.';
        }
        if ($errors !== []) {
            return [false, $errors];
        }

        $exists = $pdo->prepare('SELECT 1 FROM users WHERE email = :email');
        $exists->execute(['email' => $email]);
        if ($exists->fetchColumn()) {
            return [false, ['An account already uses that email address.']];
        }

        $barangay = $pdo->prepare('SELECT 1 FROM barangays WHERE id = :id');
        $barangay->execute(['id' => $barangayId]);
        if (!$barangay->fetchColumn()) {
            return [false, ['The selected barangay is not available.']];
        }

        $statement = $pdo->prepare(
            "INSERT INTO users (full_name, email, phone, password_hash, role, barangay_id, status, privacy_consent_at)
             VALUES (:name, :email, :phone, :hash, 'guardian', :barangay_id, 'active', NOW())"
        );
        try {
            $statement->execute([
                'name' => $name,
                'email' => $email,
                'phone' => $phone === '' ? null : $phone,
                'hash' => password_hash($password, PASSWORD_DEFAULT),
                'barangay_id' => $barangayId,
            ]);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                return [false, ['An account already uses that email address.']];
            }
            throw $exception;
        }
        $id = (int) $pdo->lastInsertId();
        $pdo->prepare('UPDATE registration_attempts SET was_successful = 1 WHERE id = :id')
            ->execute(['id' => $registrationAttemptId]);
        Audit::log('auth.register', 'user', $id, ['role' => 'guardian'], $id);

        if (!headers_sent()) {
            session_regenerate_id(true);
        }
        $_SESSION['user_id'] = $id;
        $_SESSION['session_version'] = 0;
        $_SESSION['last_activity'] = time();
        self::forgetUser();
        return [true, []];
    }

    public static function logout(bool $record = true): void
    {
        if ($record && self::id()) {
            Audit::log('auth.logout', 'user', self::id());
        }
        unset($_SESSION['user_id'], $_SESSION['session_version'], $_SESSION['last_activity']);
        self::forgetUser();
        if (!headers_sent()) {
            session_regenerate_id(true);
        }
    }

    public static function enforceSessionLifetime(): void
    {
        if (empty($_SESSION['user_id'])) {
            return;
        }
        $last = (int) ($_SESSION['last_activity'] ?? time());
        if ((time() - $last) > (int) config('session_lifetime', 1800)) {
            self::logout(false);
            flash('warning', 'Your session expired after being inactive. Please sign in again.');
            return;
        }
        $_SESSION['last_activity'] = time();
    }

    public static function forgetUser(): void
    {
        self::$cachedUser = null;
        self::$loaded = false;
    }

    /**
     * Rehash a verified password without overwriting a password changed by another request.
     * A single conflict reloads and re-authenticates the current row; repeated contention fails closed.
     */
    private static function rehashPasswordSafely(PDO $pdo, array $user, string $email, string $password): ?array
    {
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $oldHash = (string) ($user['password_hash'] ?? '');
            if (($user['status'] ?? '') !== 'active' || !password_verify($password, $oldHash)) {
                return null;
            }
            if (!password_needs_rehash($oldHash, PASSWORD_DEFAULT)) {
                return $user;
            }

            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $rehash = $pdo->prepare(
                "UPDATE users SET password_hash = :new_hash
                 WHERE id = :id AND email = :email AND status = 'active'
                   AND BINARY password_hash = BINARY :old_hash"
            );
            $rehash->execute([
                'new_hash' => $newHash,
                'id' => (int) $user['id'],
                'email' => $email,
                'old_hash' => $oldHash,
            ]);
            if ($rehash->rowCount() === 1) {
                $user['password_hash'] = $newHash;
                return $user;
            }
            if ($attempt === 1) {
                return null;
            }

            $reload = $pdo->prepare('SELECT * FROM users WHERE id = :id AND email = :email LIMIT 1');
            $reload->execute(['id' => (int) $user['id'], 'email' => $email]);
            $current = $reload->fetch();
            if (!$current || $current['status'] !== 'active'
                || !password_verify($password, (string) $current['password_hash'])) {
                return null;
            }
            $user = $current;
        }

        return null;
    }
}
