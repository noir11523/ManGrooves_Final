<?php
declare(strict_types=1);

// One-way, read-only snapshot for the Supabase importer. It never executes
// schema/seed SQL and never modifies the existing MySQL database.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/app/bootstrap.php';
$directory = APP_ROOT . '/supabase/migration-data';
if (!is_dir($directory) && !mkdir($directory, 0700, true)) throw new RuntimeException('Could not create the private export directory.');
$target = $directory . '/mysql-' . date('Ymd-His') . '.json';
if (file_exists($target)) throw new RuntimeException('An export already exists for this second. Try again.');
$tables = ['barangays', 'users', 'mangrove_species', 'health_criteria', 'health_options', 'mangrove_clusters', 'reports',
    'report_observations', 'verification_logs', 'badges', 'user_badges', 'notifications', 'audit_logs'];
$pdo = null;
// Database::connection() sets the SQL session to +08:00 regardless of PHP's zone.
$snapshot = ['format' => 'mangrooves-mysql-v1', 'exported_at' => date(DATE_ATOM), 'source_timezone' => 'Asia/Manila', 'tables' => []];
try {
    $pdo = Database::connection();
    $pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    foreach ($tables as $table) {
        $statement = $pdo->query('SELECT * FROM `' . $table . '`');
        $numeric = [];
        for ($index = 0; $index < $statement->columnCount(); $index++) {
            $meta = $statement->getColumnMeta($index);
            if (in_array($meta['native_type'] ?? '', ['TINY', 'SHORT', 'LONG', 'LONGLONG', 'INT24', 'FLOAT', 'DOUBLE', 'NEWDECIMAL', 'DECIMAL'], true)) $numeric[] = $meta['name'];
        }
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            foreach ($numeric as $key) if ($row[$key] !== null && is_numeric($row[$key])) $row[$key] = $row[$key] + 0;
            if ($table === 'users') unset($row['session_version']);
        }
        unset($row);
        $snapshot['tables'][$table] = $rows;
    }
    $pdo->commit();
    $encoded = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($target, $encoded, LOCK_EX) === false) throw new RuntimeException('Could not write the export.');
    @chmod($target, 0600);
    echo 'Export saved outside the public directory: ' . $target . PHP_EOL;
    foreach ($snapshot['tables'] as $table => $rows) echo $table . ': ' . count($rows) . PHP_EOL;
    echo 'Contains private account data and password hashes. Do not commit or share this file.' . PHP_EOL;
} catch (Throwable $error) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, 'Export failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
