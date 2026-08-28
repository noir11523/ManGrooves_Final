<?php

declare(strict_types=1);

use App\Services\AnalyticsService;
use App\Services\BadgeEngine;
use App\Services\HealthClassifier;
use App\Services\ReportService;
use App\Services\SpeciesMatcher;
use App\Services\UploadService;
use App\Services\VerificationService;

putenv('APP_ENV=testing');
putenv('APP_DEBUG=false');
putenv('DB_DATABASE=mangrooves_test');

require dirname(__DIR__) . '/app/bootstrap.php';

$passed = 0;
$failed = 0;
$testDatabase = 'mangrooves_test';

function check(bool $condition, string $message = 'Assertion failed'): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function same(mixed $expected, mixed $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        throw new RuntimeException(($message !== '' ? $message . ': ' : '')
            . 'expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

function near(float $expected, float $actual, float $tolerance, string $message = ''): void
{
    if (abs($expected - $actual) > $tolerance) {
        throw new RuntimeException(($message !== '' ? $message . ': ' : '')
            . "expected {$expected} ± {$tolerance}, got {$actual}");
    }
}

function throws(callable $callback, string $class = Throwable::class): void
{
    try {
        $callback();
    } catch (Throwable $exception) {
        if ($exception instanceof $class) {
            return;
        }
        throw new RuntimeException('Expected ' . $class . ', got ' . $exception::class . ': ' . $exception->getMessage());
    }
    throw new RuntimeException('Expected ' . $class . ' but no exception was thrown.');
}

function test_case(string $name, callable $callback): void
{
    global $passed, $failed;
    try {
        $callback();
        $passed++;
        echo "PASS  {$name}" . PHP_EOL;
    } catch (Throwable $exception) {
        $failed++;
        echo "FAIL  {$name}" . PHP_EOL;
        echo '      ' . $exception::class . ': ' . $exception->getMessage() . PHP_EOL;
    }
}

$serverDsn = sprintf(
    'mysql:host=%s;port=%d;charset=utf8mb4',
    (string) config('database.host'),
    (int) config('database.port')
);
$server = new PDO(
    $serverDsn,
    (string) config('database.username'),
    (string) config('database.password'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => true]
);

try {
    $server->exec("DROP DATABASE IF EXISTS `{$testDatabase}`");
    $server->exec("CREATE DATABASE `{$testDatabase}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $server->exec("USE `{$testDatabase}`");
    $schema = (string) file_get_contents(APP_ROOT . '/database/schema.sql');
    $seed = (string) file_get_contents(APP_ROOT . '/database/seed.sql');
    $server->exec($schema);
    $server->exec($seed);

    // Exercise the in-place compatibility path, not only the fresh CREATE TABLE path.
    $server->exec('ALTER TABLE notifications DROP INDEX uq_notifications_dedupe, DROP COLUMN dedupe_key');
    $server->exec('ALTER TABLE users DROP COLUMN session_version');
    $server->exec(
        'ALTER TABLE user_badges
         DROP COLUMN badge_name_snapshot, DROP COLUMN description_snapshot,
         DROP COLUMN metric_snapshot, DROP COLUMN target_value_snapshot,
         DROP COLUMN image_path_snapshot'
    );
    $server->exec(
        'ALTER TABLE report_observations
         DROP COLUMN criteria_code_snapshot, DROP COLUMN criterion_name_snapshot,
         DROP COLUMN score_group_snapshot, DROP COLUMN selection_mode_snapshot,
         DROP COLUMN option_code_snapshot, DROP COLUMN option_label_snapshot,
         DROP COLUMN criteria_order_snapshot, DROP COLUMN option_order_snapshot'
    );
    $server->exec($schema);

    $pdo = Database::connection();

    test_case('schema and reference seed counts', static function () use ($pdo): void {
        same(5, (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(), 'user count');
        same(7, (int) $pdo->query('SELECT COUNT(*) FROM mangrove_species')->fetchColumn(), 'species count');
        same(7, (int) $pdo->query('SELECT COUNT(*) FROM health_criteria')->fetchColumn(), 'criteria count');
        same(26, (int) $pdo->query('SELECT COUNT(*) FROM health_options')->fetchColumn(), 'option count');
        same(3, (int) $pdo->query('SELECT COUNT(*) FROM mangrove_clusters')->fetchColumn(), 'cluster count');
        same(1, (int) $pdo->query(
            "SELECT COUNT(*) FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registration_attempts'"
        )->fetchColumn(), 'registration throttle table');
        same(8, (int) $pdo->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations'
               AND COLUMN_NAME IN (
                   'criteria_code_snapshot', 'criterion_name_snapshot', 'score_group_snapshot',
                   'selection_mode_snapshot', 'option_code_snapshot', 'option_label_snapshot',
                   'criteria_order_snapshot', 'option_order_snapshot'
               )"
        )->fetchColumn(), 'observation snapshot column count');
        same(0, (int) $pdo->query(
            'SELECT COUNT(*) FROM report_observations
             WHERE criteria_code_snapshot IS NULL OR criterion_name_snapshot IS NULL
                OR option_code_snapshot IS NULL OR option_label_snapshot IS NULL'
        )->fetchColumn(), 'missing observation snapshots');
    });

    test_case('seeded password hashes verify', static function () use ($pdo): void {
        $hashes = $pdo->query('SELECT password_hash FROM users')->fetchAll(PDO::FETCH_COLUMN);
        check($hashes !== [], 'No hashes loaded');
        foreach ($hashes as $hash) {
            check(password_verify('Mangrooves123!', (string) $hash), 'A demo password hash did not verify');
        }
    });

    test_case('registration rejects malformed and oversized input before hashing', static function () use ($pdo): void {
        $before = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        set_error_handler(static function (int $severity, string $message): never {
            throw new ErrorException($message, 0, $severity);
        });
        try {
            [$registered, $errors] = Auth::registerGuardian([
                'full_name' => ['not', 'scalar'],
                'email' => ['not', 'scalar'],
                'phone' => ['not', 'scalar'],
                'barangay_id' => ['not', 'scalar'],
                'password' => str_repeat('x', 4097),
                'password_confirmation' => str_repeat('x', 4097),
                'privacy_consent' => ['not', 'scalar'],
            ]);
        } finally {
            restore_error_handler();
        }
        same(false, $registered);
        check(count($errors) >= 4, 'Expected validation errors for malformed registration input');
        same($before, (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn());

        [$nulRegistered] = Auth::registerGuardian([
            'full_name' => 'Nul Password Test',
            'email' => 'nul-password@example.test',
            'barangay_id' => '1',
            'password' => "abcdefgh\0suffix",
            'password_confirmation' => "abcdefgh\0suffix",
            'privacy_consent' => '1',
        ]);
        same(false, $nulRegistered, 'A NUL-containing bcrypt password was accepted');
        [$nulLogin] = Auth::attempt('guardian@test.com', "Mangrooves123!\0suffix");
        same(false, $nulLogin, 'A NUL-containing login password was accepted');
    });

    test_case('public registration is throttled per source IP', static function () use ($pdo): void {
        $originalLimit = $GLOBALS['app_config']['registration_attempt_limit_per_hour'];
        $originalRemote = $_SERVER['REMOTE_ADDR'] ?? null;
        $GLOBALS['app_config']['registration_attempt_limit_per_hour'] = 2;
        $_SERVER['REMOTE_ADDR'] = '198.51.100.8';
        $pdo->exec(
            "INSERT INTO registration_attempts (ip_address, was_successful) VALUES
             ('198.51.100.8', 0), ('198.51.100.8', 0)"
        );
        try {
            [$registered, $errors] = Auth::registerGuardian([
                'full_name' => 'Rate Limited Guardian',
                'email' => 'rate-limited@example.test',
                'barangay_id' => '1',
                'password' => 'a-secure-password',
                'password_confirmation' => 'a-secure-password',
                'privacy_consent' => '1',
            ]);
            same(false, $registered);
            check(str_contains(implode(' ', $errors), 'Too many registration attempts'));
            same(0, (int) $pdo->query("SELECT COUNT(*) FROM users WHERE email = 'rate-limited@example.test'")->fetchColumn());
        } finally {
            $GLOBALS['app_config']['registration_attempt_limit_per_hour'] = $originalLimit;
            if ($originalRemote === null) {
                unset($_SERVER['REMOTE_ADDR']);
            } else {
                $_SERVER['REMOTE_ADDR'] = $originalRemote;
            }
            $pdo->exec("DELETE FROM registration_attempts WHERE ip_address = '198.51.100.8'");
        }
    });

    test_case('a correct login resets prior email failures and session versions revoke sessions', static function () use ($pdo): void {
        $insert = $pdo->prepare(
            "INSERT INTO login_attempts (email, ip_address, was_successful) VALUES ('guardian@test.com', 'cli', 0)"
        );
        for ($attempt = 0; $attempt < 4; $attempt++) {
            $insert->execute();
        }
        [$authenticated] = Auth::attempt('guardian@test.com', 'Mangrooves123!');
        same(true, $authenticated, 'A successful pre-threshold login should clear email failures');
        same(0, (int) $pdo->query(
            "SELECT COUNT(*) FROM login_attempts WHERE email = 'guardian@test.com' AND was_successful = 0"
        )->fetchColumn());

        $pdo->exec(
            "INSERT INTO login_attempts (email, ip_address, was_successful) VALUES
             ('guardian@test.com', 'attacker-ip', 0), ('guardian@test.com', 'attacker-ip', 0),
             ('guardian@test.com', 'attacker-ip', 0), ('guardian@test.com', 'attacker-ip', 0),
             ('guardian@test.com', 'attacker-ip', 0)"
        );
        [$notLockedOut] = Auth::attempt('guardian@test.com', 'Mangrooves123!');
        same(true, $notLockedOut, 'Failures from another IP locked out the guardian');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $insert->execute();
        }
        [$blocked, $message] = Auth::attempt('guardian@test.com', 'Mangrooves123!');
        same(false, $blocked, 'The hard threshold did not stop credential verification');
        check(str_contains((string) $message, 'Too many failed attempts'), 'Unexpected throttle message');
        $pdo->exec("DELETE FROM login_attempts WHERE email = 'guardian@test.com' AND was_successful = 0");

        $pdo->exec('UPDATE users SET session_version = session_version + 1 WHERE id = 1');
        Auth::forgetUser();
        same(null, Auth::user(), 'Changed session version did not revoke the existing session');
        $pdo->exec('UPDATE users SET session_version = 0 WHERE id = 1');
        Auth::forgetUser();
    });

    test_case('old input preserves bounded observation selections only', static function (): void {
        remember_old_input([
            'sitio_name' => 'Field edge',
            'unexpected' => ['drop' => ['deep']],
            'observations' => [
                'leaf_color' => '1',
                'bio_indicators' => ['19', '20'],
            ],
        ]);
        same('Field edge', old('sitio_name'));
        same('', old('unexpected'));
        same(['leaf_color' => '1', 'bio_indicators' => ['19', '20']], old('observations'));
        clear_old_input();
    });

    test_case('health classifier exact thresholds', static function () use ($pdo): void {
        $classifier = new HealthClassifier($pdo);
        $base = ['bio_indicators' => [], 'negative_signs' => []];

        $healthy = $classifier->classify($base + [
            'leaf_color' => 1, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15,
        ]);
        same(6, $healthy['health_score']);
        same('Healthy', $healthy['status']);

        $stressed = $classifier->classify($base + [
            'leaf_color' => 2, 'leaf_condition' => 5, 'pests' => 9, 'roots' => 12, 'bark_trunk' => 16,
        ]);
        same(3, $stressed['health_score']);
        same('Stressed', $stressed['status']);

        $risk = $classifier->classify($base + [
            'leaf_color' => 3, 'leaf_condition' => 6, 'pests' => 10, 'roots' => 13, 'bark_trunk' => 18,
        ]);
        same(0, $risk['health_score']);
        same('At Risk', $risk['status']);
    });

    test_case('health answers reject invalid and contradictory selections', static function () use ($pdo): void {
        $classifier = new HealthClassifier($pdo);
        throws(static fn () => $classifier->classify([
            'leaf_color' => 999, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15,
        ]), InvalidArgumentException::class);
        throws(static fn () => $classifier->classify([
            'leaf_color' => 1, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15,
            'bio_indicators' => [19], 'negative_signs' => [26],
        ]), InvalidArgumentException::class);
    });

    test_case('species matcher returns exact supplied species', static function () use ($pdo): void {
        $matcher = new SpeciesMatcher($pdo);
        $result = $matcher->match([
            'root_type' => 'Prop roots (stilt roots)',
            'leaf_shape' => 'Elliptic',
            'bark_texture' => 'Rough, grayish to brown',
        ]);
        same(5, (int) $result['best']['id']);
        near(100.0, (float) $result['best']['confidence'], 0.01);
    });

    test_case('badge engine uses verified typed metrics', static function () use ($pdo): void {
        $engine = new BadgeEngine($pdo);
        $metrics = $engine->metricsForUser(1);
        same(2, $metrics['verified_reports']);
        same(1, $metrics['verified_followups']);
        same(1, $metrics['distinct_species']);
    });

    test_case('earned badge snapshots survive definition edits and deactivation', static function () use ($pdo): void {
        $pdo->exec("UPDATE badges SET badge_name = 'Renamed Later', description = 'Changed later', active = 0 WHERE id = 1");
        $badges = (new BadgeEngine($pdo))->progressForUser(1);
        $earned = array_values(array_filter($badges, static fn (array $badge): bool => (int) $badge['id'] === 1))[0] ?? null;
        check($earned !== null && $earned['earned'], 'Inactive earned badge disappeared');
        same('First Report', (string) $earned['badge_name']);
        $pdo->exec("UPDATE badges SET badge_name = 'First Report', description = 'Submitted your first verified report!', active = 1 WHERE id = 1");
    });

    test_case('analytics uses latest verified alive counts', static function () use ($pdo): void {
        $analytics = (new AnalyticsService($pdo))->dashboard([]);
        near(79.2, (float) $analytics['overall_survival'], 0.1);
        same(3, (int) $analytics['survival_eligible_clusters']);
        same(2, (int) $analytics['health']['Healthy']);
        same(1, (int) $analytics['health']['Stressed']);
        same(1, (int) $analytics['health']['At Risk']);
    });

    test_case('analytics species scope follows report-level identification', static function () use ($pdo): void {
        $pdo->exec('UPDATE mangrove_clusters SET species_id = 6 WHERE id = 2');
        $analytics = (new AnalyticsService($pdo))->dashboard(['species_id' => 1]);
        $clusterIds = array_map('intval', array_column($analytics['clusters'], 'id'));
        check(in_array(2, $clusterIds, true), 'Historical species-filtered survival omitted its matching report cluster');
        $pdo->exec('UPDATE mangrove_clusters SET species_id = 1 WHERE id = 2');
    });

    test_case('an unresolved expert species is not relabeled from the automatic suggestion', static function () use ($pdo): void {
        $pdo->exec('UPDATE reports SET final_species_id = NULL WHERE id = 3');
        try {
            $analytics = (new AnalyticsService($pdo))->dashboard(['species_id' => 1]);
            $clusterIds = array_map('intval', array_column($analytics['clusters'], 'id'));
            check(!in_array(2, $clusterIds, true), 'Unresolved expert outcome contaminated species-filtered survival');

            $results = (new ReportService($pdo))->reportsForUser(['id' => 2, 'role' => 'expert'], [], 1, 50);
            $report = array_values(array_filter(
                $results['items'],
                static fn (array $row): bool => (int) $row['id'] === 3
            ))[0] ?? null;
            check($report !== null, 'Expected report 3 in expert listing');
            same(null, $report['species_name'], 'Verified unresolved species fell back to the suggestion');
        } finally {
            $pdo->exec('UPDATE reports SET final_species_id = 1 WHERE id = 3');
        }
    });

    test_case('period-filtered analytics uses the latest report rarity snapshot', static function () use ($pdo): void {
        $pdo->exec("UPDATE reports SET rarity_level = 'Vulnerable' WHERE id = 3");
        $pdo->exec("UPDATE mangrove_clusters SET rarity_level = 'Rare' WHERE id = 2");
        try {
            $analytics = (new AnalyticsService($pdo))->dashboard(['species_id' => 1]);
            $cluster = array_values(array_filter(
                $analytics['clusters'],
                static fn (array $row): bool => (int) $row['id'] === 2
            ))[0] ?? null;
            check($cluster !== null, 'Expected cluster 2 in filtered survival results');
            same('Vulnerable', (string) $cluster['rarity_level']);
        } finally {
            $pdo->exec("UPDATE reports SET rarity_level = 'Common' WHERE id = 3");
            $pdo->exec("UPDATE mangrove_clusters SET rarity_level = 'Common' WHERE id = 2");
        }
    });

    test_case('survival percentages are capped at one hundred', static function () use ($pdo): void {
        $pdo->exec('UPDATE reports SET observed_alive_count = 500 WHERE id = 3');
        $analytics = (new AnalyticsService($pdo))->dashboard([]);
        $cluster = array_values(array_filter(
            $analytics['clusters'],
            static fn (array $row): bool => (int) $row['id'] === 2
        ))[0] ?? null;
        check($cluster !== null, 'Cluster 2 was not returned');
        same(100.0, (float) $cluster['survival_rate']);
        $pdo->exec('UPDATE reports SET observed_alive_count = 74 WHERE id = 3');
    });

    test_case('dashboard creates idempotent due notifications', static function () use ($pdo): void {
        $pdo->exec("DELETE FROM notifications WHERE user_id = 1 AND type = 'followup_overdue' AND link = 'submit-report.php?parent=2'");
        $service = new ReportService($pdo);
        $dashboard = $service->dashboard(['id' => 1, 'role' => 'guardian']);
        check($dashboard['reminders'] !== [], 'Expected the seeded overdue reminder');
        $service->dashboard(['id' => 1, 'role' => 'guardian']);
        same(1, (int) $pdo->query("SELECT COUNT(*) FROM notifications WHERE user_id = 1 AND type = 'followup_overdue' AND link = 'submit-report.php?parent=2'")->fetchColumn());
    });

    test_case('guardian submissions reject coordinates far outside the barangay', static function () use ($pdo): void {
        $service = new ReportService($pdo);
        throws(static fn () => $service->submitGuardianReport(1, [
            'field_confirmation' => '1',
            'latitude' => '0',
            'longitude' => '0',
            'location_source' => 'manual',
        ], []), InvalidArgumentException::class);
    });

    test_case('guardian submissions require a usable living-count baseline', static function () use ($pdo): void {
        $location = $pdo->query('SELECT center_lat, center_lng FROM barangays WHERE id = 1')->fetch();
        check((bool) $location, 'Missing seeded barangay center');
        $base = [
            'field_confirmation' => '1',
            'latitude' => (string) $location['center_lat'],
            'longitude' => (string) $location['center_lng'],
            'location_source' => 'manual',
            'sitio_name' => 'Baseline test',
            'root_type' => 'Prop roots',
            'leaf_shape' => 'Elliptic',
            'bark_texture' => 'Rough, grayish to brown',
        ];
        $service = new ReportService($pdo);

        foreach ([null, '0'] as $value) {
            $payload = $base;
            if ($value !== null) {
                $payload['observed_alive_count'] = $value;
            }
            try {
                $service->submitGuardianReport(1, $payload, []);
                throw new RuntimeException('A new site without a positive baseline was accepted');
            } catch (InvalidArgumentException $exception) {
                check(
                    str_contains($exception->getMessage(), $value === null ? 'number of mangroves' : 'at least one'),
                    'Unexpected baseline validation message: ' . $exception->getMessage()
                );
            }
        }
    });

    test_case('guardian report submissions enforce the hourly quota', static function () use ($pdo): void {
        $originalLimit = $GLOBALS['app_config']['report_submission_limit_per_hour'];
        $GLOBALS['app_config']['report_submission_limit_per_hour'] = 1;
        $pdo->exec('UPDATE reports SET submitted_at = NOW() WHERE id = 1');
        $temporary = tempnam(sys_get_temp_dir(), 'mgr-quota-');
        check($temporary !== false, 'Could not create a quota upload fixture');
        check(copy(APP_ROOT . '/public/assets/img/guides/leaf-color.png', $temporary), 'Could not copy quota upload fixture');
        $size = filesize($temporary);
        check($size !== false, 'Could not measure quota upload fixture');
        $before = (int) $pdo->query('SELECT COUNT(*) FROM reports')->fetchColumn();

        try {
            throws(static fn () => (new ReportService($pdo))->submitGuardianReport(1, [
                'field_confirmation' => '1',
                'cluster_id' => '1',
                'latitude' => '10.2765',
                'longitude' => '123.8867',
                'location_source' => 'manual',
                'sitio_name' => 'Quota test site',
                'observed_alive_count' => '50',
                'root_type' => 'Prop roots',
                'leaf_shape' => 'Elliptic',
                'bark_texture' => 'Rough, grayish to brown',
                'observations' => [
                    'leaf_color' => '1',
                    'leaf_condition' => '4',
                    'pests' => '8',
                    'roots' => '11',
                    'bark_trunk' => '15',
                    'bio_indicators' => ['19'],
                    'negative_signs' => [],
                ],
            ], [
                'error' => UPLOAD_ERR_OK,
                'tmp_name' => $temporary,
                'size' => $size,
                'name' => 'quota-test.png',
            ]), InvalidArgumentException::class);
            same($before, (int) $pdo->query('SELECT COUNT(*) FROM reports')->fetchColumn());
        } finally {
            $GLOBALS['app_config']['report_submission_limit_per_hour'] = $originalLimit;
            $pdo->exec('UPDATE reports SET submitted_at = DATE_SUB(NOW(), INTERVAL 60 DAY) WHERE id = 1');
            if (is_file($temporary)) {
                unlink($temporary);
            }
        }
    });

    test_case('historical checklist labels survive rule edits and deactivation', static function () use ($pdo): void {
        $pdo->exec("UPDATE health_criteria SET name = 'Changed criterion', active = 0 WHERE id = 1");
        $pdo->exec("UPDATE health_options SET label = 'Changed option', active = 0 WHERE id = 1");
        try {
            $detail = (new ReportService($pdo))->reportDetail(1, ['id' => 1, 'role' => 'guardian']);
            check($detail !== null, 'Seeded report detail disappeared');
            $leaf = array_values(array_filter(
                $detail['observations'],
                static fn (array $row): bool => $row['name'] === 'Leaf Color'
            ))[0] ?? null;
            check($leaf !== null, 'Historical criterion snapshot disappeared');
            same('Green', (string) ($leaf['options'][0]['label'] ?? ''));
        } finally {
            $pdo->exec("UPDATE health_criteria SET name = 'Leaf Color', active = 1 WHERE id = 1");
            $pdo->exec("UPDATE health_options SET label = 'Green', active = 1 WHERE id = 1");
        }
    });

    test_case('verification commits report, cluster, log, reminder, and notification', static function () use ($pdo): void {
        $pdo->exec('UPDATE mangrove_clusters SET radius_meters = 500 WHERE id IN (1, 2)');
        $pdo->exec('UPDATE reports r JOIN mangrove_clusters c ON c.id = 1 SET r.cluster_id = 2, r.latitude = c.center_lat, r.longitude = c.center_lng WHERE r.id = 5');
        $service = new VerificationService($pdo);
        $result = $service->review(5, 2, [
            'action' => 'confirm',
            'expert_feedback' => 'Test confirmation feedback.',
            'needs_attention' => '1',
        ]);
        same('verified', $result['status']);
        same(2, (int) $result['cluster_id'], 'Explicit plausible cluster selection was not preserved');

        $row = $pdo->query('SELECT status, final_health, final_species_id, next_followup_date, needs_attention FROM reports WHERE id = 5')->fetch();
        same('verified', $row['status']);
        same('Stressed', $row['final_health']);
        same(2, (int) $row['final_species_id']);
        check($row['next_followup_date'] !== null, 'Follow-up date was not scheduled');
        same(1, (int) $row['needs_attention']);
        same(1, (int) $pdo->query('SELECT COUNT(*) FROM verification_logs WHERE report_id = 5')->fetchColumn());
        same(1, (int) $pdo->query(
            "SELECT COUNT(*) FROM audit_logs WHERE action = 'report.confirm' AND entity_type = 'report' AND entity_id = '5'"
        )->fetchColumn(), 'Verification audit row was not committed');
        same(1, (int) $pdo->query("SELECT COUNT(*) FROM notifications WHERE user_id = 1 AND type = 'report_verified'")->fetchColumn());
        same(1, (int) $pdo->query("SELECT COUNT(*) FROM notifications WHERE user_id = 1 AND type = 'needs_attention' AND link = 'reports.php?id=5'")->fetchColumn());

        throws(static fn () => $service->review(5, 2, ['action' => 'confirm']), DomainException::class);
    });

    test_case('reject action requires actionable feedback', static function () use ($pdo): void {
        $service = new VerificationService($pdo);
        throws(static fn () => $service->review(5, 2, ['action' => 'reject']), InvalidArgumentException::class);
    });

    test_case('rejected reports cannot retain a conservation-attention flag', static function () use ($pdo): void {
        $pdo->exec("UPDATE reports SET status = 'pending', verified_at = NULL, expert_id = NULL, expert_feedback = NULL WHERE id = 6");
        $service = new VerificationService($pdo);
        $result = $service->review(6, 2, [
            'action' => 'reject',
            'expert_feedback' => 'Retake the field evidence closer to the mangrove.',
            'needs_attention' => '1',
        ]);
        same('rejected', $result['status']);
        same(0, (int) $pdo->query('SELECT needs_attention FROM reports WHERE id = 6')->fetchColumn());
    });

    test_case('a promoted submitter cannot verify their own pending report', static function () use ($pdo): void {
        $pdo->exec("UPDATE users SET role = 'expert' WHERE id = 4");
        $pdo->exec("UPDATE reports SET status = 'pending', verified_at = NULL, expert_id = NULL WHERE id = 6");
        $service = new VerificationService($pdo);
        throws(static fn () => $service->review(6, 4, [
            'action' => 'reject',
            'expert_feedback' => 'Self review must never be accepted.',
        ]), DomainException::class);
        same('pending', (string) $pdo->query('SELECT status FROM reports WHERE id = 6')->fetchColumn());
        $pdo->exec("UPDATE users SET role = 'guardian' WHERE id = 4");
    });

    test_case('upload service accepts a genuine bundled PNG and removes it safely', static function (): void {
        $temporary = tempnam(sys_get_temp_dir(), 'mgr-test-');
        check($temporary !== false, 'Could not create a temporary file');
        check(copy(APP_ROOT . '/public/assets/img/guides/leaf-color.png', $temporary), 'Could not prepare upload fixture');
        $size = filesize($temporary);
        check($size !== false, 'Could not read fixture size');

        $service = new UploadService();
        $stored = $service->storeReportPhoto([
            'error' => UPLOAD_ERR_OK,
            'tmp_name' => $temporary,
            'size' => $size,
            'name' => '../../field-photo.png',
        ]);
        check(is_file($stored['absolute_path']), 'Stored photo is missing');
        same('image/png', $stored['mime']);
        check(!str_contains($stored['path'], '..'), 'Stored path contains traversal');
        $service->removeStoredPhoto($stored['absolute_path']);
        check(!is_file($stored['absolute_path']), 'Stored fixture was not removed');
    });

    test_case('foreign-key integrity has no orphan records', static function () use ($pdo): void {
        same(0, (int) $pdo->query(
            'SELECT COUNT(*) FROM report_observations ro LEFT JOIN reports r ON r.id=ro.report_id WHERE r.id IS NULL'
        )->fetchColumn());
        same(0, (int) $pdo->query(
            'SELECT COUNT(*) FROM reports r LEFT JOIN users u ON u.id=r.user_id WHERE u.id IS NULL'
        )->fetchColumn());
        same(0, (int) $pdo->query(
            'SELECT COUNT(*) FROM user_badges ub LEFT JOIN badges b ON b.id=ub.badge_id WHERE b.id IS NULL'
        )->fetchColumn());
    });
} catch (Throwable $exception) {
    $failed++;
    echo 'FATAL Test database setup failed: ' . $exception::class . ': ' . $exception->getMessage() . PHP_EOL;
} finally {
    Database::reset();
    try {
        $server->exec("DROP DATABASE IF EXISTS `{$testDatabase}`");
    } catch (Throwable $cleanupError) {
        echo 'WARN  Could not remove test database: ' . $cleanupError->getMessage() . PHP_EOL;
    }
}

echo PHP_EOL . "Result: {$passed} passed, {$failed} failed" . PHP_EOL;
exit($failed === 0 ? 0 : 1);
