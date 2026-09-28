<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/app/bootstrap.php';
// MySQL DDL commits implicitly; never wrap ALTER TABLE in a transaction.
Database::connection()->exec(file_get_contents(APP_ROOT . '/database/migrations/20260928_checklist_management.sql'));
Database::connection()->exec(file_get_contents(APP_ROOT . '/database/migrations/20260928_context_choices.sql'));
echo "Checklist management ready. Existing report scores and answers are preserved.\n";
