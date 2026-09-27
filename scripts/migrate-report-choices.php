<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/app/bootstrap.php';
Database::transaction(static function (PDO $pdo): void {
    $pdo->exec(file_get_contents(APP_ROOT . '/database/migrations/20260927_report_choices.sql'));
});
echo "Report checklist choices ready. Existing reports are unchanged.\n";
