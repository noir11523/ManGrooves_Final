<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('GET', 'POST');
$user = MobileApi::requireUser();
$pdo = Database::connection();
$service = new \App\Services\NotificationService($pdo);
$service->syncForUser($user);
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $input = MobileApi::input();
    if (($input['action'] ?? '') === 'mark_all') {
        $update = $pdo->prepare('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE user_id = :user_id');
        $update->execute(['user_id' => (int) $user['id']]);
    } elseif (($input['action'] ?? '') === 'mark_read' && filter_var($input['id'] ?? null, FILTER_VALIDATE_INT)) {
        $update = $pdo->prepare('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = :id AND user_id = :user_id');
        $update->execute(['id' => (int) $input['id'], 'user_id' => (int) $user['id']]);
    } else {
        json_response(['ok' => false, 'message' => 'Choose a valid notification action.'], 422);
    }
}
json_response(['ok' => true] + $service->listing($user, max(1, (int) ($_GET['page'] ?? 1))));
