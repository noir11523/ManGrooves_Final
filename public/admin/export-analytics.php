<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/app/bootstrap.php';
Auth::requireRoles('system_admin');
\App\Services\AnalyticsPdf::download(Database::connection(), $_GET);
