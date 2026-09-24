<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/app/bootstrap.php';
$pdo = Database::connection();
$before = $pdo->query('SELECT id, full_name FROM users ORDER BY id')->fetchAll();
$pdo->exec(file_get_contents(APP_ROOT . '/database/migrations/20260918_user_names.sql'));
$after = $pdo->query('SELECT id, full_name FROM users ORDER BY id')->fetchAll();
if ($before !== $after) {
    throw new RuntimeException('User records changed during migration; review before continuing.');
}
echo 'Name columns and index ready. Preserved ' . count($after) . " existing names unchanged.\n";
