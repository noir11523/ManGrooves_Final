<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/app/bootstrap.php';
$user = Auth::requireRoles('expert', 'system_admin');
$results = (new App\Services\ValidationHistory(Database::connection()))->forStaff($user, filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT) ?: 1);
render('admin/validation-history', ['pageTitle' => 'Validation history', 'results' => $results]);
