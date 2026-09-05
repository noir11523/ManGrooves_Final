<div class="page-intro notification-intro">
    <div>
        <p class="eyebrow">Updates and reminders</p>
        <h1 class="d-lg-none">Notifications</h1>
        <p>Keep up with expert feedback, due follow-ups, badges, and important site activity.</p>
    </div>
    <?php if ($unreadTotal > 0): ?>
        <form method="post" action="<?= e(url('notifications.php')) ?>">
            <?= Csrf::field() ?>
            <input type="hidden" name="action" value="mark_all">
            <input type="hidden" name="filter" value="<?= e($filter) ?>">
            <button class="btn btn-outline-primary" type="submit" data-submit-label="Marking all…"><i class="bi bi-check2-all me-1" aria-hidden="true"></i> Mark all as read</button>
        </form>
    <?php endif; ?>
</div>

<div class="notification-toolbar" aria-label="Notification filters">
    <a class="filter-chip <?= $filter === 'all' ? 'active' : '' ?>" href="<?= e(url('notifications.php')) ?>" <?= $filter === 'all' ? 'aria-current="page"' : '' ?>>All <span><?= e((string) $totalAll) ?></span></a>
    <a class="filter-chip <?= $filter === 'unread' ? 'active' : '' ?>" href="<?= e(url('notifications.php?filter=unread')) ?>" <?= $filter === 'unread' ? 'aria-current="page"' : '' ?>>Unread <span><?= e((string) $unreadTotal) ?></span></a>
</div>

<?php if ($notifications === []): ?>
    <section class="empty-state content-card">
        <span class="empty-state-icon"><i class="bi <?= $filter === 'unread' ? 'bi-check2-circle' : 'bi-bell' ?>" aria-hidden="true"></i></span>
        <h2><?= $filter === 'unread' ? 'You are all caught up' : 'No notifications yet' ?></h2>
        <p><?= $filter === 'unread' ? 'There are no unread updates waiting for you.' : 'Expert feedback, follow-up reminders, and badge updates will appear here.' ?></p>
        <a class="btn btn-primary" href="<?= e(url('dashboard.php')) ?>">Return to dashboard</a>
    </section>
<?php else: ?>
    <section class="notification-list" aria-label="Notifications">
        <?php foreach ($notifications as $notification): ?>
            <?php
            $isUnread = empty($notification['read_at']);
            [$notificationIcon, $notificationTone] = match ((string) $notification['type']) {
                'badge_earned' => ['bi-award-fill', 'gold'],
                'followup_overdue' => ['bi-calendar-x-fill', 'danger'],
                'followup_due', 'followup_due_soon' => ['bi-calendar-event-fill', 'warning'],
                'needs_attention' => ['bi-exclamation-triangle-fill', 'danger'],
                'report_verified' => ['bi-patch-check-fill', 'success'],
                'report_rejected' => ['bi-x-octagon-fill', 'danger'],
                default => ['bi-bell-fill', 'primary'],
            };
            ?>
            <article class="notification-item <?= $isUnread ? 'is-unread' : '' ?>">
                <span class="notification-icon tone-<?= e($notificationTone) ?>"><i class="bi <?= e($notificationIcon) ?>" aria-hidden="true"></i></span>
                <div class="notification-copy">
                    <div class="notification-title-row">
                        <h2><?= e((string) $notification['title']) ?></h2>
                        <?php if ($isUnread): ?><span class="unread-label">New</span><?php endif; ?>
                    </div>
                    <p><?= e((string) $notification['message']) ?></p>
                    <time datetime="<?= e(date(DATE_ATOM, strtotime((string) $notification['created_at']))) ?>"><i class="bi bi-clock me-1" aria-hidden="true"></i><?= e(format_datetime((string) $notification['created_at'])) ?></time>
                </div>
                <div class="notification-actions">
                    <?php if ($notification['safe_link'] !== null): ?>
                        <form method="post" action="<?= e(url('notifications.php')) ?>">
                            <?= Csrf::field() ?>
                            <input type="hidden" name="action" value="open">
                            <input type="hidden" name="notification_id" value="<?= e((string) $notification['id']) ?>">
                            <button class="btn btn-sm btn-primary" type="submit">View</button>
                        </form>
                    <?php elseif ($isUnread): ?>
                        <form method="post" action="<?= e(url('notifications.php')) ?>">
                            <?= Csrf::field() ?>
                            <input type="hidden" name="action" value="mark_read">
                            <input type="hidden" name="notification_id" value="<?= e((string) $notification['id']) ?>">
                            <input type="hidden" name="filter" value="<?= e($filter) ?>">
                            <button class="btn btn-sm btn-outline-primary" type="submit" aria-label="Mark <?= e((string) $notification['title']) ?> as read">Mark read</button>
                        </form>
                    <?php endif; ?>
                </div>
            </article>
        <?php endforeach; ?>
    </section>

    <?php if ($totalPages > 1): ?>
        <nav class="mt-4" aria-label="Notification pages">
            <ul class="pagination justify-content-center">
                <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>"><a class="page-link" href="<?= e(url('notifications.php?' . query_string(['page' => $page - 1, 'filter' => $filter === 'all' ? null : $filter]))) ?>" aria-label="Previous page"><i class="bi bi-chevron-left" aria-hidden="true"></i></a></li>
                <?php for ($number = max(1, $page - 2); $number <= min($totalPages, $page + 2); $number++): ?>
                    <li class="page-item <?= $number === $page ? 'active' : '' ?>"><a class="page-link" href="<?= e(url('notifications.php?' . query_string(['page' => $number, 'filter' => $filter === 'all' ? null : $filter]))) ?>" <?= $number === $page ? 'aria-current="page"' : '' ?>><?= e((string) $number) ?></a></li>
                <?php endfor; ?>
                <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>"><a class="page-link" href="<?= e(url('notifications.php?' . query_string(['page' => $page + 1, 'filter' => $filter === 'all' ? null : $filter]))) ?>" aria-label="Next page"><i class="bi bi-chevron-right" aria-hidden="true"></i></a></li>
            </ul>
        </nav>
    <?php endif; ?>
<?php endif; ?>
