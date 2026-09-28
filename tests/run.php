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
    $legacyNames = $server->query('SELECT id, full_name FROM users ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
    $server->exec('ALTER TABLE users DROP INDEX idx_users_last_first, DROP COLUMN first_name, DROP COLUMN last_name, DROP COLUMN session_version');
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

    test_case('name migration preserves legacy names and is repeatable', static function () use ($pdo, $legacyNames): void {
        same($legacyNames, $pdo->query('SELECT id, full_name FROM users ORDER BY id')->fetchAll());
        same(5, (int) $pdo->query('SELECT COUNT(*) FROM users WHERE first_name IS NULL AND last_name IS NULL')->fetchColumn());
        $pdo->exec(file_get_contents(APP_ROOT . '/database/migrations/20260918_user_names.sql'));
        same($legacyNames, $pdo->query('SELECT id, full_name FROM users ORDER BY id')->fetchAll());
    });

    test_case('name parts validate without guessing compound or legacy names', static function (): void {
        $names = \App\Services\UserName::fromInput(['first_name' => ' María Elena ', 'last_name' => " Dela Cruz-O'Neil "]);
        same('María Elena', $names['first_name']);
        same("Dela Cruz-O'Neil", $names['last_name']);
        same("María Elena Dela Cruz-O'Neil", $names['full_name']);
        foreach ([['first_name' => [], 'last_name' => 'Cruz'], ['first_name' => 'Ana'], ['first_name' => 'Ana', 'last_name' => str_repeat('x', 60)]] as $invalid) {
            throws(static fn () => \App\Services\UserName::fromInput($invalid), InvalidArgumentException::class);
        }
        same($names, \App\Services\UserName::fromInput(['full_name' => $names['full_name']], true, $names));
        $changed = \App\Services\UserName::fromInput(['full_name' => 'Another Compound Name'], true, $names);
        same(null, $changed['first_name']);
        same(null, $changed['last_name']);
        same('Another Compound Name', $changed['full_name']);
    });

    test_case('schema and reference seed counts', static function () use ($pdo): void {
        same(5, (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(), 'user count');
        same(7, (int) $pdo->query('SELECT COUNT(*) FROM mangrove_species')->fetchColumn(), 'species count');
        same(7, (int) $pdo->query('SELECT COUNT(*) FROM health_criteria')->fetchColumn(), 'criteria count');
        same(40, (int) $pdo->query('SELECT COUNT(*) FROM health_options')->fetchColumn(), 'option count');
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

    test_case('report form includes the guardian monitoring area for manual pins', static function () use ($pdo): void {
        $service = new ReportService($pdo);
        $form = $service->formData(['role' => 'guardian', 'barangay_id' => 1]);
        same(1, (int) $form['location']['barangay']['id']);
        check(is_numeric($form['location']['barangay']['center_lat']), 'Missing map latitude');
        check(is_numeric($form['location']['barangay']['center_lng']), 'Missing map longitude');
        same((float) config('barangay_max_distance_meters', 5000), $form['location']['max_distance_meters']);
        same((float) config('gps_max_accuracy_meters', 100), $form['location']['max_gps_accuracy_meters']);
        $unassigned = $service->formData(['role' => 'guardian', 'barangay_id' => null]);
        same(null, $unassigned['location']['barangay']);
        same([], $unassigned['clusters']);
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

    test_case('all 27 scored health combinations match their breakdown and thresholds', static function () use ($pdo): void {
        $classifier = new HealthClassifier($pdo);
        foreach ([1 => 2, 2 => 1, 3 => 0] as $leaf => $leafPoints) {
            foreach ([8 => 2, 9 => 1, 10 => 0] as $pest => $pestPoints) {
                foreach ([11 => 2, 12 => 1, 13 => 0] as $root => $rootPoints) {
                    $result = $classifier->classify(['leaf_color' => $leaf, 'pests' => $pest, 'roots' => $root, 'leaf_condition' => 4, 'bark_trunk' => 15]);
                    $score = $leafPoints + $pestPoints + $rootPoints;
                    same($score, $result['health_score']);
                    same($score, array_sum(array_column($result['breakdown'], 'points')));
                    same($score === 6 ? 'Healthy' : ($score >= 3 ? 'Stressed' : 'At Risk'), $result['status']);
                }
            }
        }
        $pdo->beginTransaction();
        try {
            $pdo->exec("UPDATE health_criteria SET active = 0 WHERE code = 'roots'");
            throws(static fn () => $classifier->classify(['leaf_color' => 1, 'pests' => 8, 'leaf_condition' => 4, 'bark_trunk' => 15]), InvalidArgumentException::class);
        } finally { $pdo->rollBack(); }
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

    test_case('aggregate checklist options score correctly and reject contradictions', static function () use ($pdo): void {
        $classifier = new HealthClassifier($pdo);
        $ids = [];
        foreach ($classifier->criteriaWithOptions() as $criterion) {
            foreach ($criterion['options'] as $option) {
                $ids[$criterion['code']][$option['code']] = $option['id'];
            }
        }
        $base = ['leaf_color' => 1, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15];
        $bioNone = $ids['bio_indicators']['none_of_the_above'];
        $bioAll = $ids['bio_indicators']['all_of_the_above'];
        $negativeNone = $ids['negative_signs']['none_of_the_above'];
        $negativeAll = $ids['negative_signs']['all_of_the_above'];
        same(true, isset($ids['leaf_color']['all_of_the_above']));
        same(false, isset($ids['leaf_color']['none_of_the_above']));
        same(false, isset($ids['leaf_condition']['all_of_the_above']));
        $none = $classifier->classify($base + ['bio_indicators' => [$bioNone], 'negative_signs' => [$negativeNone]]);
        same(0, $none['environmental_score']);
        same('Healthy', $none['status']);
        $all = $classifier->classify($base + ['bio_indicators' => [$bioAll], 'negative_signs' => [$negativeNone]]);
        same(5, $all['environmental_score']);
        same(6, $all['health_score']);
        same('All of the above', $all['observations'][5]['option_label']);
        same(5, $all['observations'][5]['points']);
        same(-3, $classifier->classify($base + ['bio_indicators' => [$bioNone], 'negative_signs' => [$negativeAll]])['environmental_score']);
        foreach ([[$bioNone, 19], [$bioAll, 19], [$bioNone, $bioAll]] as $invalid) {
            throws(static fn () => $classifier->classify($base + ['bio_indicators' => $invalid]), InvalidArgumentException::class);
        }
        throws(static fn () => $classifier->classify($base + ['bio_indicators' => [$bioAll], 'negative_signs' => [$negativeAll]]), InvalidArgumentException::class);
        throws(static fn () => $classifier->classify($base + ['bio_indicators' => [19], 'negative_signs' => [$negativeAll]]), InvalidArgumentException::class);
        $before = $pdo->query('SELECT * FROM health_options ORDER BY id')->fetchAll();
        $pdo->exec(file_get_contents(APP_ROOT . '/database/migrations/20260927_report_choices.sql'));
        $pdo->exec(file_get_contents(APP_ROOT . '/database/migrations/20260927_report_choices.sql'));
        same($before, $pdo->query('SELECT * FROM health_options ORDER BY id')->fetchAll());
    });

    test_case('unknown answers are unscored and aggregate choices exclude unknown', static function () use ($pdo): void {
        $classifier = new HealthClassifier($pdo);
        $base = ['leaf_color' => 1, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15];
        foreach ($classifier->criteriaWithOptions() as $criterion) {
            $special = [];
            foreach ($criterion['options'] as $option) $special[$option['code']] = $option['id'];
            $unknown = $classifier->classify(array_replace($base, [$criterion['code'] => $special['unknown']]));
            same('Unknown', $unknown['status']);
            same(null, $unknown['health_score']);
            same(true, $unknown['needs_review']);
            throws(static fn () => $classifier->classify(array_replace($base, [$criterion['code'] => [$special['unknown'], $criterion['options'][0]['id']]])), InvalidArgumentException::class);
            if ($criterion['selection_mode'] === 'multiple') {
                $none = $classifier->classify($base + [$criterion['code'] => $special['none_of_the_above']]);
                same('Healthy', $none['status']);
                same(0, $none['environmental_score']);
                $all = $classifier->classify($base + [$criterion['code'] => $special['all_of_the_above']]);
                same('Healthy', $all['status']);
                same(false, $all['needs_review']);
            }
        }
    });

    test_case('all health choices use the lowest score and Not Sure stays unscored', static function () use ($pdo): void {
        $classifier = new HealthClassifier($pdo);
        $base = ['leaf_color' => 1, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15];
        $all = [];
        foreach ($classifier->criteriaWithOptions() as $criterion) {
            foreach ($criterion['options'] as $option) {
                if ($option['code'] === 'unknown') same('Not Sure', $option['label']);
                if (in_array($criterion['code'], HealthClassifier::HEALTH_CODES, true) && $option['code'] === 'all_of_the_above') {
                    $all[$criterion['code']] = $option['id'];
                    $result = $classifier->classify(array_replace($base, [$criterion['code'] => $option['id']]));
                    same(4, $result['health_score']); same('Stressed', $result['status']);
                    throws(static fn () => $classifier->classify(array_replace($base, [$criterion['code'] => [$option['id'], $base[$criterion['code']]]])), InvalidArgumentException::class);
                }
            }
        }
        same(3, count($all));
        $result = $classifier->classify(array_replace($base, $all));
        same(0, $result['health_score']); same('At Risk', $result['status']);
    });

    test_case('admin edits checklist scores with audit, stale protection and historical snapshots', static function () use ($pdo): void {
        $pdo->beginTransaction();
        try {
            $service = new \App\Services\ChecklistService($pdo);
            $input = $service->data()[0];
            throws(static fn () => $service->save(['id' => 2, 'role' => 'expert'], $input), InvalidArgumentException::class);
            $before = $pdo->query('SELECT * FROM report_observations WHERE report_id = 1')->fetchAll();
            $input['options'][0]['points'] = 1;
            $input['options'][1]['points'] = 2;
            $input['options'][0]['label'] = 'Green leaves';
            $service->save(['id' => 3, 'role' => 'system_admin'], $input);
            $score = (new HealthClassifier($pdo))->classify(['leaf_color' => 1, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15]);
            same(5, $score['health_score']);
            same('Stressed', $score['status']);
            same($before, $pdo->query('SELECT * FROM report_observations WHERE report_id = 1')->fetchAll());
            same(6, (int) $pdo->query('SELECT health_score FROM reports WHERE id = 1')->fetchColumn());
            check((int) $pdo->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'admin.checklist_updated'")->fetchColumn() > 0);
            throws(static fn () => $service->save(['id' => 3, 'role' => 'system_admin'], $input), InvalidArgumentException::class);
            $invalid = $service->data()[0];
            $invalid['options'][0]['points'] = 3;
            throws(static fn () => $service->save(['id' => 3, 'role' => 'system_admin'], $invalid), InvalidArgumentException::class);
            $invalid = $service->data()[0];
            foreach ($invalid['options'] as &$option) if ($option['code'] !== 'unknown') $option['points'] = 1;
            unset($option);
            throws(static fn () => $service->save(['id' => 3, 'role' => 'system_admin'], $invalid), InvalidArgumentException::class);
        } finally { $pdo->rollBack(); }
    });

    test_case('reference imports keep administrator checklist settings and include unknown choices', static function () use ($pdo): void {
        $pdo->beginTransaction();
        try {
            $pdo->exec("UPDATE health_criteria SET name = 'Custom leaf check', guide_image = NULL WHERE id = 1");
            $pdo->exec("UPDATE health_options SET label = 'Custom green label', points = 1 WHERE id = 1");
            $pdo->exec(file_get_contents(APP_ROOT . '/database/reference.sql'));
            $pdo->exec(file_get_contents(APP_ROOT . '/database/reference.sql'));
            same('Custom leaf check', $pdo->query('SELECT name FROM health_criteria WHERE id = 1')->fetchColumn());
            same('Custom green label', $pdo->query('SELECT label FROM health_options WHERE id = 1')->fetchColumn());
            same(1, (int) $pdo->query('SELECT points FROM health_options WHERE id = 1')->fetchColumn());
            same(7, (int) $pdo->query("SELECT COUNT(*) FROM health_options WHERE code = 'unknown'")->fetchColumn());
        } finally { $pdo->rollBack(); }
    });

    test_case('unknown report stays pending and requires an explicit final health', static function () use ($pdo): void {
        $temporary = tempnam(sys_get_temp_dir(), 'mgr-unknown-');
        copy(APP_ROOT . '/public/assets/img/guides/leaf-color.png', $temporary);
        $storedPath = null;
        $pdo->beginTransaction();
        try {
            $unknown = (int) $pdo->query("SELECT o.id FROM health_options o JOIN health_criteria c ON c.id = o.criteria_id WHERE c.code = 'leaf_color' AND o.code = 'unknown'")->fetchColumn();
            $result = (new ReportService($pdo))->submitGuardianReport(1, [
                'field_confirmation' => '1', 'latitude' => '10.279', 'longitude' => '123.879',
                'location_source' => 'manual', 'sitio_name' => 'Unknown test',
                'observed_alive_count' => '50', 'root_type' => 'Prop roots',
                'leaf_shape' => 'Elliptic', 'bark_texture' => 'Rough, grayish to brown',
                'observations' => ['leaf_color' => $unknown, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15],
            ], ['error' => UPLOAD_ERR_OK, 'tmp_name' => $temporary, 'size' => filesize($temporary), 'name' => 'unknown.png']);
            $id = (int) $result['id'];
            $row = $pdo->query('SELECT * FROM reports WHERE id = ' . $id)->fetch();
            $storedPath = APP_ROOT . '/' . $row['photo_path'];
            same('pending', $row['status']); same(null, $row['health_score']); same('Unknown', $row['suggested_health']);
            $detail = (new ReportService($pdo))->reportDetail($id, ['id' => 1, 'role' => 'guardian']);
            same(null, $detail['observations'][0]['options'][0]['points']);
            throws(static fn () => (new VerificationService($pdo))->review($id, 2, ['action' => 'confirm']), InvalidArgumentException::class);
            $verified = (new VerificationService($pdo))->review($id, 2, ['action' => 'correct', 'final_health' => 'Stressed', 'rarity_level' => 'Unassigned', 'expert_feedback' => 'Reviewed photo.']);
            same('verified', $verified['status']);
            same('Unknown', $pdo->query('SELECT previous_health FROM verification_logs WHERE report_id = ' . $id)->fetchColumn());
        } finally {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($storedPath && is_file($storedPath)) unlink($storedPath);
            if (is_file($temporary)) unlink($temporary);
        }
    });

    test_case('healthy submissions automatically verify with cluster, notification, badge and follow-up', static function () use ($pdo): void {
        $temporary = tempnam(sys_get_temp_dir(), 'mgr-auto-');
        copy(APP_ROOT . '/public/assets/img/guides/leaf-color.png', $temporary);
        $storedPath = null;
        $pdo->beginTransaction();
        try {
            $result = (new ReportService($pdo))->submitGuardianReport(1, [
                'field_confirmation' => '1', 'latitude' => '10.279', 'longitude' => '123.879',
                'location_source' => 'manual', 'sitio_name' => 'Automatic verification test',
                'observed_alive_count' => '50', 'root_type' => 'Prop roots',
                'leaf_shape' => 'Elliptic', 'bark_texture' => 'Rough, grayish to brown',
                'observations' => ['leaf_color' => 1, 'leaf_condition' => 4, 'pests' => 8, 'roots' => 11, 'bark_trunk' => 15],
            ], ['error' => UPLOAD_ERR_OK, 'tmp_name' => $temporary, 'size' => filesize($temporary), 'name' => 'healthy.png']);
            same('verified', $result['status']);
            $id = (int) $result['id'];
            $row = $pdo->query('SELECT * FROM reports WHERE id = ' . $id)->fetch();
            $storedPath = APP_ROOT . '/' . $row['photo_path'];
            same('Healthy', $row['final_health']);
            same(null, $row['expert_id']);
            check($row['verified_at'] !== null);
            same($pdo->query('SELECT DATE_ADD(CURDATE(), INTERVAL 30 DAY)')->fetchColumn(), $row['next_followup_date']);
            $cluster = $pdo->query('SELECT * FROM mangrove_clusters WHERE id = ' . (int) $row['cluster_id'])->fetch();
            same('Healthy', $cluster['latest_health']);
            same(1, (int) $cluster['verified_count']);
            same(50, (int) $cluster['initial_seedlings']);
            same(1, (int) $pdo->query("SELECT COUNT(*) FROM notifications WHERE type = 'report_verified' AND link = 'reports.php?id={$id}'")->fetchColumn());
            same(1, (int) $pdo->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'report.auto_verified' AND entity_id = '{$id}'")->fetchColumn());
            check((int) $pdo->query('SELECT COUNT(*) FROM user_badges WHERE user_id = 1')->fetchColumn() > 0);
            throws(static fn () => (new VerificationService($pdo))->review($id, 2, ['action' => 'confirm']), DomainException::class);
        } finally {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($storedPath && is_file($storedPath)) unlink($storedPath);
            if (is_file($temporary)) unlink($temporary);
        }
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

    test_case('guardian analytics scope covers totals, charts, shared clusters and attention reports', static function () use ($pdo): void {
        $pdo->beginTransaction();
        try {
            // Another guardian has the newer visit in the same cluster.
            $pdo->exec("UPDATE reports SET user_id = 4, final_health = 'At Risk', needs_attention = 1 WHERE id = 2");
            $service = new AnalyticsService($pdo);
            $data = $service->forUser(['id' => 1, 'role' => 'guardian'], ['user_id' => 4, 'scope' => 'all_users']);
            same('personal', $data['scope']);
            same((int) $pdo->query('SELECT COUNT(*) FROM reports WHERE user_id = 1')->fetchColumn(), (int) $data['verification']['total']);
            $verified = (int) $pdo->query("SELECT COUNT(*) FROM reports WHERE user_id = 1 AND status = 'verified'")->fetchColumn();
            same($verified, array_sum($data['health']));
            same($verified, (int) array_sum(array_column($data['growth'], 'verified_reports')));
            $ownIds = array_map('intval', $pdo->query('SELECT id FROM reports WHERE user_id = 1')->fetchAll(PDO::FETCH_COLUMN));
            foreach ($data['high_risk'] as $report) check(in_array((int) $report['id'], $ownIds, true));
            $cluster = array_values(array_filter($data['clusters'], static fn ($row) => $row['id'] === 1))[0];
            same(1, (int) $cluster['latest_report_id'], 'A different guardian latest visit must not replace the personal observation');
            same('Healthy', $cluster['latest_health']);
            $marker = array_values(array_filter($data['map'], static fn ($row) => $row['id'] === 1))[0];
            same('Healthy', $marker['health']);
            check(!str_contains(json_encode($data), 'MGR-DEMO-0002'), 'Personal payload exposed another guardian report');
            check(!isset($data['overall_survival'], $cluster['initial_seedlings'], $marker['survival']));
            same(false, $data['capabilities']['can_export_pdf']);
        } finally { $pdo->rollBack(); }
    });

    test_case('expert and administrator analytics aggregate all users', static function () use ($pdo): void {
        $service = new AnalyticsService($pdo);
        $total = (int) $pdo->query('SELECT COUNT(*) FROM reports')->fetchColumn();
        foreach ([['id' => 2, 'role' => 'expert'], ['id' => 3, 'role' => 'system_admin']] as $user) {
            $data = $service->forUser($user, ['user_id' => 1, 'scope' => 'personal']);
            same('all_users', $data['scope']);
            same($total, (int) $data['verification']['total']);
            same($user['role'] === 'system_admin', $data['capabilities']['can_export_pdf']);
        }
    });

    test_case('a guardian without reports has empty analytics and cannot select another account', static function () use ($pdo): void {
        $service = new AnalyticsService($pdo);
        $data = $service->forUser(['id' => 999999, 'role' => 'guardian'], ['user_id' => 1]);
        same(0, (int) $data['verification']['total']);
        same(0, array_sum($data['health']));
        foreach (['growth', 'clusters', 'map', 'high_risk'] as $key) same([], $data[$key]);
        throws(static fn () => $service->forUser(['id' => 0, 'role' => 'guardian'], []), InvalidArgumentException::class);
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

    test_case('guardian submissions reject network-level GPS accuracy', static function () use ($pdo): void {
        $location = $pdo->query('SELECT center_lat, center_lng FROM barangays WHERE id = 1')->fetch();
        check((bool) $location, 'Missing seeded barangay center');
        try {
            (new ReportService($pdo))->submitGuardianReport(1, [
                'field_confirmation' => '1',
                'latitude' => (string) $location['center_lat'],
                'longitude' => (string) $location['center_lng'],
                'location_source' => 'gps',
                'location_accuracy' => '50000',
            ], []);
            throw new RuntimeException('A 50 km GPS estimate was accepted');
        } catch (InvalidArgumentException $exception) {
            check(str_contains($exception->getMessage(), 'better GPS signal'), 'Unexpected accuracy validation message');
        }
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

    test_case('new passwords accept simple 8-25 character values and reject out-of-range lengths', static function (): void {
        foreach (['abcdefgh', 'a simple passphrase', str_repeat('x', 25)] as $password) {
            check(\App\Services\PasswordPolicy::isValid($password));
        }
        foreach (['short', str_repeat('x', 26), "valid123\0"] as $password) {
            check(!\App\Services\PasswordPolicy::isValid($password));
        }
    });

    test_case('staff notifications backfill pending work once and preserve read state', static function () use ($pdo): void {
        $pdo->beginTransaction();
        try {
            $pdo->exec("UPDATE reports SET status = 'pending' WHERE id = 6");
            $service = new \App\Services\NotificationService($pdo);
            foreach ([['id' => 2, 'role' => 'expert'], ['id' => 3, 'role' => 'system_admin']] as $user) {
                $service->syncForUser($user);
                $service->syncForUser($user);
                $id = (int) $user['id'];
                same(1, (int) $pdo->query("SELECT COUNT(*) FROM notifications WHERE user_id = {$id} AND dedupe_key = 'report_pending:{$id}:6'")->fetchColumn());
                $pdo->exec("UPDATE notifications SET read_at = NOW() WHERE user_id = {$id} AND dedupe_key = 'report_pending:{$id}:6'");
                $service->syncForUser($user);
                same(0, (int) $pdo->query("SELECT COUNT(*) FROM notifications WHERE user_id = {$id} AND dedupe_key = 'report_pending:{$id}:6' AND read_at IS NULL")->fetchColumn());
            }
        } finally { $pdo->rollBack(); }
    });

    test_case('report pin cannot silently select a distant cluster', static function () use ($pdo): void {
        try {
            (new ReportService($pdo))->submitGuardianReport(1, [
                'field_confirmation' => '1', 'cluster_id' => '1',
                'latitude' => '10.279', 'longitude' => '123.879', 'location_source' => 'manual',
            ], []);
            throw new RuntimeException('Mismatched site was not rejected');
        } catch (InvalidArgumentException $exception) {
            check(str_contains($exception->getMessage(), 'does not match the selected cluster'));
        }
    });

    test_case('analytics generates an actual paginated PDF', static function () use ($pdo): void {
        $data = (new AnalyticsService($pdo))->dashboard([]);
        $pdf = (new \App\Services\AnalyticsPdf())->generate($data);
        check(str_starts_with($pdf, '%PDF-'));
        check(str_contains($pdf, '%%EOF'));
        check(strlen($pdf) > 2000);
        $directory = APP_ROOT . '/tmp/pdfs';
        if (!is_dir($directory)) mkdir($directory, 0775, true);
        file_put_contents($directory . '/analytics-sample.pdf', $pdf);
    });

    test_case('dashboard totals and report filters agree for guardians and staff', static function () use ($pdo): void {
        $service = new ReportService($pdo);
        foreach ([1, 2, 3] as $id) {
            $user = $pdo->query('SELECT * FROM users WHERE id = ' . $id)->fetch();
            $dashboard = $service->dashboard($user);
            same((int) $dashboard['stats']['total_reports'], $service->reportsForUser($user)['total']);
            foreach (['verified', 'pending', 'rejected'] as $status) {
                same((int) $dashboard['stats'][$status . '_reports'], $service->reportsForUser($user, ['status' => $status])['total']);
            }
            $attention = $service->reportsForUser($user, ['needs_attention' => '1']);
            same((int) $dashboard['stats']['needs_attention'], $attention['total']);
            foreach ($attention['items'] as $report) {
                same('verified', $report['status']);
                same(1, (int) $report['needs_attention']);
            }
            same(count($dashboard['clusters']), $dashboard['stats']['map_clusters']);
            foreach ($dashboard['clusters'] as $cluster) {
                $filtered = $service->reportsForUser($user, ['cluster_id' => (string) $cluster['id']]);
                foreach ($filtered['items'] as $report) {
                    same((int) $cluster['id'], (int) $pdo->query('SELECT cluster_id FROM reports WHERE id = ' . (int) $report['id'])->fetchColumn());
                }
            }
        }
    });

    test_case('maps, timelines and validation history respect viewer access', static function () use ($pdo): void {
        $service = new ReportService($pdo);
        $guardian = $pdo->query('SELECT * FROM users WHERE id = 1')->fetch();
        $expert = $pdo->query('SELECT * FROM users WHERE id = 2')->fetch();
        foreach ($service->reportsForUser($guardian, [], 1, 50)['items'] as $report) {
            same(1, (int) $pdo->query('SELECT user_id FROM reports WHERE id = ' . (int) $report['id'])->fetchColumn());
            check(is_numeric($report['latitude']) && is_numeric($report['longitude']));
        }
        foreach ($service->clustersForMap($guardian) as $cluster) {
            $timeline = $service->clusterTimeline((int) $cluster['id'], $guardian)['timeline'];
            $last = '';
            foreach ($timeline as $entry) {
                check($entry['submitted_at'] >= $last);
                $last = $entry['submitted_at'];
                if (!$entry['can_view_details']) {
                    same(null, $entry['photo_path']); same(null, $entry['latitude']); same(null, $entry['expert_feedback']);
                }
            }
        }
        $history = new \App\Services\ValidationHistory($pdo);
        check($history->forStaff($expert)['total'] > 0);
        throws(static fn () => $history->forStaff($guardian), DomainException::class);
        $outside = $guardian; $outside['barangay_id'] = 999;
        same(null, $service->clusterTimeline(1, $outside));
    });

    test_case('species identification stays unresolved for incomplete or tied traits', static function () use ($pdo): void {
        $matcher = new SpeciesMatcher($pdo);
        same(null, $matcher->match(['root_type' => 'Prop roots'])['best']);
        $pdo->beginTransaction();
        try {
            $original = $pdo->query('SELECT root_type, leaf_shape, bark_texture FROM mangrove_species WHERE id = 1')->fetch();
            $update = $pdo->prepare('UPDATE mangrove_species SET root_type = ?, leaf_shape = ?, bark_texture = ? WHERE id = 2');
            $update->execute(array_values($original));
            same(null, $matcher->match($original)['best']);
        } finally { $pdo->rollBack(); }
    });

    test_case('history panels render empty visits and zero living counts', static function (): void {
        foreach ([[], [['observed_alive_count' => 0, 'submitted_at' => '2026-09-27 12:00:00', 'health' => 'At Risk']]] as $healthGrowthEntries) {
            ob_start();
            try {
                require APP_ROOT . '/app/Views/partials/health-growth.php';
                $html = ob_get_contents();
            } finally { ob_end_clean(); }
            check(str_contains($html, $healthGrowthEntries ? 'width:0%' : 'No verified counts yet.'));
        }
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
