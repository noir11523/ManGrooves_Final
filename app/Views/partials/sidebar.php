<?php
$role = (string) ($authUser['role'] ?? 'guardian');
$requestPath = strtolower(str_replace('\\', '/', (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH)));
$roleLabel = match ($role) {
    'expert' => 'CCENRO Expert',
    'system_admin' => 'System Administrator',
    default => 'Mangrove Guardian',
};
$roleIcon = match ($role) {
    'expert' => 'bi-clipboard2-check',
    'system_admin' => 'bi-shield-check',
    default => 'bi-tree',
};

$navigation = $role === 'guardian'
    ? [
        ['Dashboard', 'dashboard.php', 'bi-grid-1x2-fill'],
        ['Submit report', 'submit-report.php', 'bi-camera-fill'],
        ['My reports', 'reports.php', 'bi-journal-text'],
        ['Explore species', 'explore.php', 'bi-map-fill'],
        ['My badges', 'badges.php', 'bi-award-fill'],
    ]
    : [
        ['Dashboard', 'dashboard.php', 'bi-grid-1x2-fill'],
        ['Verification', 'admin/verification.php', 'bi-clipboard2-check-fill'],
        ['Analytics', 'admin/analytics.php', 'bi-bar-chart-fill'],
        ['Clusters', 'admin/cluster.php', 'bi-pin-map-fill'],
    ];

if ($role === 'system_admin') {
    $navigation = array_merge($navigation, [
        ['Users', 'admin/users.php', 'bi-people-fill'],
        ['Species', 'admin/species.php', 'bi-tree-fill'],
        ['Manage badges', 'admin/badges.php', 'bi-award-fill'],
        ['Audit log', 'admin/audit.php', 'bi-shield-lock-fill'],
    ]);
}

$isActive = static function (string $href) use ($requestPath): bool {
    $needle = '/' . strtolower($href);
    return str_ends_with($requestPath, $needle);
};
?>
<aside class="app-sidebar d-none d-lg-flex" aria-label="Application sidebar">
    <a class="app-brand sidebar-brand" href="<?= e(url('dashboard.php')) ?>" aria-label="ManGROOVES dashboard">
        <?php require APP_ROOT . '/app/Views/partials/brand.php'; ?>
    </a>

    <div class="sidebar-user">
        <span class="user-avatar" aria-hidden="true"><?= e(mb_strtoupper(mb_substr((string) $authUser['full_name'], 0, 1))) ?></span>
        <span class="min-w-0">
            <strong class="d-block text-truncate"><?= e((string) $authUser['full_name']) ?></strong>
            <small><i class="bi <?= e($roleIcon) ?> me-1" aria-hidden="true"></i><?= e($roleLabel) ?></small>
        </span>
    </div>

    <nav class="sidebar-nav" aria-label="Workspace navigation">
        <span class="sidebar-section-label">Workspace</span>
        <?php foreach ($navigation as [$label, $href, $icon]): ?>
            <a class="sidebar-link <?= $isActive($href) ? 'active' : '' ?>" href="<?= e(url($href)) ?>" <?= $isActive($href) ? 'aria-current="page"' : '' ?>>
                <i class="bi <?= e($icon) ?>" aria-hidden="true"></i>
                <span><?= e($label) ?></span>
            </a>
        <?php endforeach; ?>

        <span class="sidebar-section-label mt-3">Account</span>
        <a class="sidebar-link <?= $isActive('notifications.php') ? 'active' : '' ?>" href="<?= e(url('notifications.php')) ?>" <?= $isActive('notifications.php') ? 'aria-current="page"' : '' ?>>
            <i class="bi bi-bell-fill" aria-hidden="true"></i>
            <span>Notifications</span>
            <?php if ($unreadNotificationCount > 0): ?>
                <span class="sidebar-badge" aria-label="<?= e((string) $unreadNotificationCount) ?> unread"><?= e((string) min($unreadNotificationCount, 99)) ?><?= $unreadNotificationCount > 99 ? '+' : '' ?></span>
            <?php endif; ?>
        </a>
        <a class="sidebar-link <?= $isActive('settings.php') ? 'active' : '' ?>" href="<?= e(url('settings.php')) ?>" <?= $isActive('settings.php') ? 'aria-current="page"' : '' ?>>
            <i class="bi bi-gear-fill" aria-hidden="true"></i>
            <span>Settings</span>
        </a>
    </nav>

    <div class="sidebar-footer">
        <button class="sidebar-link border-0 w-100 d-none" type="button" data-install-app>
            <i class="bi bi-phone-fill" aria-hidden="true"></i><span>Install app</span>
        </button>
        <form method="post" action="<?= e(url('logout.php')) ?>">
            <?= Csrf::field() ?>
            <button class="sidebar-link border-0 w-100" type="submit">
                <i class="bi bi-box-arrow-left" aria-hidden="true"></i><span>Sign out</span>
            </button>
        </form>
    </div>
</aside>
