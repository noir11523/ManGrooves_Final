<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

$user = Auth::requireLogin();
$pdo = Database::connection();

$safeNotificationLink = static function (?string $link): ?string {
    $link = trim((string) $link);
    if ($link === '' || str_contains($link, '..') || !preg_match('/^[a-z0-9_\/-]+\.php(?:\?[a-z0-9_.=&%+-]*)?$/i', $link)) {
        return null;
    }
    return $link;
};

if (is_post()) {
    Csrf::validateOrFail();
    $action = scalar_string($_POST['action'] ?? null);
    $filterRedirect = scalar_string($_POST['filter'] ?? null) === 'unread' ? '?filter=unread' : '';

    if ($action === 'mark_all') {
        $statement = $pdo->prepare('UPDATE notifications SET read_at = NOW() WHERE user_id = :user_id AND read_at IS NULL');
        $statement->execute(['user_id' => (int) $user['id']]);
        Audit::log('notifications.marked_all_read', 'user', (int) $user['id'], ['count' => $statement->rowCount()]);
        flash('success', $statement->rowCount() > 0 ? 'All notifications were marked as read.' : 'You have no unread notifications.');
        redirect('notifications.php' . $filterRedirect);
    }

    $notificationId = filter_var($_POST['notification_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$notificationId || !in_array($action, ['mark_read', 'open'], true)) {
        flash('danger', 'That notification action is not available.');
        redirect('notifications.php' . $filterRedirect);
    }

    $lookup = $pdo->prepare('SELECT id, link FROM notifications WHERE id = :id AND user_id = :user_id LIMIT 1');
    $lookup->execute(['id' => $notificationId, 'user_id' => (int) $user['id']]);
    $notification = $lookup->fetch();
    if (!$notification) {
        flash('danger', 'That notification could not be found.');
        redirect('notifications.php' . $filterRedirect);
    }

    $markRead = $pdo->prepare('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = :id AND user_id = :user_id');
    $markRead->execute(['id' => $notificationId, 'user_id' => (int) $user['id']]);

    if ($action === 'open') {
        $target = $safeNotificationLink($notification['link'] ?? null);
        redirect($target ?? 'notifications.php');
    }

    flash('success', 'Notification marked as read.');
    redirect('notifications.php' . $filterRedirect);
}

$filter = scalar_string($_GET['filter'] ?? null) === 'unread' ? 'unread' : 'all';
$page = max(1, (int) scalar_string($_GET['page'] ?? null, '1'));
$perPage = 15;

$totalStatement = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id');
$totalStatement->execute(['user_id' => (int) $user['id']]);
$totalAll = (int) $totalStatement->fetchColumn();

$unreadStatement = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL');
$unreadStatement->execute(['user_id' => (int) $user['id']]);
$unreadTotal = (int) $unreadStatement->fetchColumn();

$filteredTotal = $filter === 'unread' ? $unreadTotal : $totalAll;
$totalPages = max(1, (int) ceil($filteredTotal / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;
$whereUnread = $filter === 'unread' ? ' AND read_at IS NULL' : '';
$statement = $pdo->prepare(
    'SELECT id, type, title, message, link, read_at, created_at
     FROM notifications WHERE user_id = :user_id' . $whereUnread . '
     ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset'
);
$statement->bindValue(':user_id', (int) $user['id'], PDO::PARAM_INT);
$statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
$statement->bindValue(':offset', $offset, PDO::PARAM_INT);
$statement->execute();
$notifications = $statement->fetchAll();
foreach ($notifications as &$notification) {
    $notification['safe_link'] = $safeNotificationLink($notification['link'] ?? null);
}
unset($notification);

render('notifications', [
    'pageTitle' => 'Notifications',
    'pageDescription' => 'Review your ManGROOVES alerts, expert feedback, and monitoring reminders.',
    'bodyClass' => 'notifications-page',
    'user' => $user,
    'notifications' => $notifications,
    'filter' => $filter,
    'page' => $page,
    'totalPages' => $totalPages,
    'totalAll' => $totalAll,
    'unreadTotal' => $unreadTotal,
]);
