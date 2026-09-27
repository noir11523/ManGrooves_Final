<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';
MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
if (!in_array($user['role'], ['expert', 'system_admin'], true)) json_response(['ok' => false, 'message' => 'Staff access required.'], 403);
$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT) ?: 1;
json_response(['ok' => true] + (new App\Services\ValidationHistory(Database::connection()))->forStaff($user, $page));
