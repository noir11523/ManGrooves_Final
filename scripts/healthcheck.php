<?php

declare(strict_types=1);

$allowNoAdmin = in_array('--allow-no-admin', $argv ?? [], true);
require dirname(__DIR__) . '/app/bootstrap.php';

$failures = [];
$requiredExtensions = ['pdo_mysql', 'fileinfo', 'mbstring', 'openssl', 'json'];
foreach ($requiredExtensions as $extension) {
    if (!extension_loaded($extension)) {
        $failures[] = "Missing PHP extension: {$extension}";
    }
}

foreach ([
    'report uploads' => (string) config('uploads.directory'),
    'sessions' => APP_ROOT . '/storage/sessions',
    'generated analytics' => APP_ROOT . '/public/generated/analytics',
] as $label => $directory) {
    if (!is_dir($directory) || !is_writable($directory)) {
        $failures[] = "Directory is missing or not writable ({$label}): {$directory}";
    }
}

try {
    $pdo = Database::connection();
    $minimums = [
        'barangays' => 1,
        'mangrove_species' => 7,
        'health_criteria' => 7,
        'health_options' => 26,
        'badges' => 6,
    ];
    foreach ($minimums as $table => $minimum) {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
        echo str_pad($table, 22) . $count . PHP_EOL;
        if ($count < $minimum) {
            $failures[] = "{$table} has {$count} rows; at least {$minimum} required reference rows are expected.";
        }
    }
    foreach (['users', 'reports', 'mangrove_clusters', 'registration_attempts'] as $table) {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
        echo str_pad($table, 22) . $count . PHP_EOL;
    }
    $activeAdmins = (int) $pdo->query(
        "SELECT COUNT(*) FROM users WHERE role = 'system_admin' AND status = 'active'"
    )->fetchColumn();
    echo str_pad('active_admins', 22) . $activeAdmins . PHP_EOL;
    if (!$allowNoAdmin && $activeAdmins < 1) {
        $failures[] = 'No active system administrator exists.';
    }

    $requiredColumns = [
        'users' => ['session_version'],
        'notifications' => ['dedupe_key'],
        'user_badges' => [
            'badge_name_snapshot', 'description_snapshot', 'metric_snapshot',
            'target_value_snapshot', 'image_path_snapshot',
        ],
        'report_observations' => [
            'criteria_code_snapshot', 'criterion_name_snapshot', 'score_group_snapshot',
            'selection_mode_snapshot', 'option_code_snapshot', 'option_label_snapshot',
            'criteria_order_snapshot', 'option_order_snapshot',
        ],
    ];
    $columnCheck = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name'
    );
    foreach ($requiredColumns as $table => $columns) {
        foreach ($columns as $column) {
            $columnCheck->execute(['table_name' => $table, 'column_name' => $column]);
            if ((int) $columnCheck->fetchColumn() !== 1) {
                $failures[] = "Required database column is missing: {$table}.{$column}";
            }
        }
    }

    $dedupeIndex = $pdo->query(
        "SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
           AND INDEX_NAME = 'uq_notifications_dedupe' AND NON_UNIQUE = 0"
    )->fetchColumn();
    if ((int) $dedupeIndex < 1) {
        $failures[] = 'Required unique notification deduplication index is missing.';
    }

    $missingBadgeSnapshots = (int) $pdo->query(
        'SELECT COUNT(*) FROM user_badges
         WHERE badge_name_snapshot IS NULL OR description_snapshot IS NULL
            OR metric_snapshot IS NULL OR target_value_snapshot IS NULL'
    )->fetchColumn();
    if ($missingBadgeSnapshots > 0) {
        $failures[] = "Earned badges with incomplete historical snapshots: {$missingBadgeSnapshots}";
    }
    $missingObservationSnapshots = (int) $pdo->query(
        'SELECT COUNT(*) FROM report_observations
         WHERE criteria_code_snapshot IS NULL OR criterion_name_snapshot IS NULL
            OR score_group_snapshot IS NULL OR selection_mode_snapshot IS NULL
            OR option_code_snapshot IS NULL OR option_label_snapshot IS NULL
            OR criteria_order_snapshot IS NULL OR option_order_snapshot IS NULL'
    )->fetchColumn();
    if ($missingObservationSnapshots > 0) {
        $failures[] = "Report observations with incomplete historical snapshots: {$missingObservationSnapshots}";
    }

    $orphanChecks = [
        'report/user orphans' => 'SELECT COUNT(*) FROM reports r LEFT JOIN users u ON u.id = r.user_id WHERE u.id IS NULL',
        'observation/report orphans' => 'SELECT COUNT(*) FROM report_observations ro LEFT JOIN reports r ON r.id = ro.report_id WHERE r.id IS NULL',
        'badge/user orphans' => 'SELECT COUNT(*) FROM user_badges ub LEFT JOIN users u ON u.id = ub.user_id WHERE u.id IS NULL',
    ];
    foreach ($orphanChecks as $label => $sql) {
        $count = (int) $pdo->query($sql)->fetchColumn();
        if ($count > 0) {
            $failures[] = "Integrity check failed ({$label}): {$count}";
        }
    }
} catch (Throwable $exception) {
    $failures[] = 'Database check failed: ' . $exception->getMessage();
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL  {$failure}" . PHP_EOL);
    }
    exit(1);
}

echo 'Application health check: OK' . PHP_EOL;
exit(0);
