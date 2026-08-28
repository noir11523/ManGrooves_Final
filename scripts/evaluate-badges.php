<?php

declare(strict_types=1);

use App\Services\BadgeEngine;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/app/bootstrap.php';

$pdo = Database::connection();
$guardianIds = $pdo->query(
    "SELECT id FROM users WHERE role = 'guardian' AND status = 'active' ORDER BY id"
)->fetchAll(PDO::FETCH_COLUMN);
$engine = new BadgeEngine($pdo);
$awarded = 0;
$failures = 0;

foreach ($guardianIds as $guardianId) {
    try {
        $awarded += count($engine->evaluateForUser((int) $guardianId));
    } catch (Throwable $exception) {
        $failures++;
        fwrite(STDERR, 'Guardian ' . (int) $guardianId . ': ' . $exception->getMessage() . PHP_EOL);
    }
}

echo 'Guardians evaluated: ' . count($guardianIds) . PHP_EOL;
echo 'New badge awards: ' . $awarded . PHP_EOL;
echo 'Failures: ' . $failures . PHP_EOL;
exit($failures === 0 ? 0 : 1);
