<?php
$displayTitle = isset($pageHeading) && trim((string) $pageHeading) !== '' ? (string) $pageHeading : $pageTitle;
?>
<header class="app-topbar">
    <div class="topbar-brand d-lg-none">
        <a class="app-brand compact-brand" href="<?= e(url('dashboard.php')) ?>">
            <?php require APP_ROOT . '/app/Views/partials/brand.php'; ?>
        </a>
    </div>
    <div class="topbar-title d-none d-lg-block">
        <p class="eyebrow mb-0"><?= e($authUser['role'] === 'guardian' ? 'Guardian workspace' : 'Conservation operations') ?></p>
        <h1><?= e($displayTitle) ?></h1>
    </div>
    <div class="topbar-actions ms-auto">

        <div class="dropdown d-lg-none">
            <button class="icon-button" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Analytics and timelines"><i class="bi bi-bar-chart" aria-hidden="true"></i></button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li><a class="dropdown-item" href="<?= e(url('analytics.php')) ?>">Analytics</a></li>
                <li><a class="dropdown-item" href="<?= e(url('clusters.php?view=health')) ?>">Health history</a></li>
                <li><a class="dropdown-item" href="<?= e(url('clusters.php?view=growth')) ?>">Growth timeline</a></li>
            </ul>
        </div>
        <a class="icon-button position-relative" href="<?= e(url('notifications.php')) ?>" aria-label="Notifications<?= $unreadNotificationCount ? ', ' . $unreadNotificationCount . ' unread' : '' ?>">
            <i class="bi bi-bell" aria-hidden="true"></i>
            <?php if ($unreadNotificationCount > 0): ?><span class="notification-count" aria-hidden="true"><?= e((string) min($unreadNotificationCount, 99)) ?><?= $unreadNotificationCount > 99 ? '+' : '' ?></span><?php endif; ?>
        </a>
        <div class="dropdown">
            <button class="user-menu" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Account menu">
                <span class="user-avatar user-avatar-sm" aria-hidden="true"><?= e(mb_strtoupper(mb_substr((string) $authUser['full_name'], 0, 1))) ?></span>
                <span class="d-none d-sm-block text-start">
                    <strong><?= e((string) $authUser['full_name']) ?></strong>
                    <small><?= e($roleLabel ?? ucfirst(str_replace('_', ' ', (string) $authUser['role']))) ?></small>
                </span>
                <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li><a class="dropdown-item" href="<?= e(url('settings.php')) ?>"><i class="bi bi-person-gear me-2" aria-hidden="true"></i>Profile settings</a></li>
                <li><hr class="dropdown-divider"></li>
                <li>
                    <form method="post" action="<?= e(url('logout.php')) ?>">
                        <?= Csrf::field() ?>
                        <button class="dropdown-item text-danger" type="submit"><i class="bi bi-box-arrow-left me-2" aria-hidden="true"></i>Sign out</button>
                    </form>
                </li>
            </ul>
        </div>
    </div>
</header>
