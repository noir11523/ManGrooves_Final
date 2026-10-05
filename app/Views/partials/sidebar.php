<?php
$role = (string) ($authUser['role'] ?? 'guardian');
$requestPath = strtolower(str_replace('\\', '/', (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH)));
$roleLabel = match ($role) {
    'expert' => 'CCENRO Expert',
    'system_admin' => 'System Administrator',
    default => 'Mangrove Guardian',
};

$analyticsNavigation = ['Analytics', 'analytics.php', 'bi-bar-chart-fill', [
    ['Health history', 'clusters.php?view=health', 'bi-clock-history'],
    ['Growth timeline', 'clusters.php?view=growth', 'bi-graph-up-arrow'],
]];

$navigation = $role === 'guardian'
    ? [
        ['Dashboard', 'dashboard.php', 'bi-grid-1x2-fill'],
        ['Submit report', 'submit-report.php', 'bi-camera-fill'],
        ['My reports', 'reports.php', 'bi-journal-text'],
        ['Explore species', 'explore.php', 'bi-map-fill'],
        $analyticsNavigation,
        ['My badges', 'badges.php', 'bi-award-fill'],
    ]
    : [
        ['Dashboard', 'dashboard.php', 'bi-grid-1x2-fill'],
        ['Verification', 'admin/verification.php', 'bi-clipboard2-check-fill'],
        $analyticsNavigation,
    ];

if ($role === 'system_admin') {
    $navigation = array_merge($navigation, [
        ['Users', 'admin/users.php', 'bi-people-fill'],
        ['Species', 'admin/species.php', 'bi-tree-fill'],
        ['Health checklist', 'admin/checklist.php', 'bi-list-check'],
        ['Manage badges', 'admin/badges.php', 'bi-award-fill'],
        ['Audit log', 'admin/audit.php', 'bi-shield-lock-fill'],
    ]);
}

if (defined('MANGROOVES_CLOUD')) {
    $roleLabel = match ($role) { 'expert' => 'Expert', 'system_admin' => 'Administrator', default => 'Coastal Guardian' };
    if ($role !== 'guardian') {
        array_splice($navigation, 1, 0, [['Reports', 'reports.php', 'bi-journal-text']]);
        $navigation[] = ['Review history', 'admin/validation-history.php', 'bi-clock-history'];
    }
    if ($role === 'expert') {
        array_splice($navigation, 2, 0, [['Submit report', 'submit-report.php', 'bi-camera-fill']]);
        $navigation[] = ['My badges', 'badges.php', 'bi-award-fill'];
    }
    if ($role === 'system_admin') {
        $navigation[] = ['Expert applications', 'admin/expert-applications.php', 'bi-person-check'];
        $navigation[] = ['Certificate signer', 'admin/certificate-settings.php', 'bi-pen'];
    }
}

$mobileItems = $role === 'guardian'
    ? [
        ['Home', 'dashboard.php', 'bi-house-door-fill'],
        ['Reports', 'reports.php', 'bi-journal-text'],
        ['Observe', 'submit-report.php', 'bi-camera-fill'],
        ['Badges', 'badges.php', 'bi-award-fill'],
    ]
    : [
        ['Home', 'dashboard.php', 'bi-house-door-fill'],
        ['Reports', 'reports.php', 'bi-journal-text'],
        ['Review', 'admin/verification.php', 'bi-clipboard2-check-fill'],
        ['Analytics', 'analytics.php', 'bi-bar-chart-fill'],
    ];
// The overflow menu contains only destinations absent from the bottom bar
// and the existing Analytics and timelines menu.
$mobilePrimaryPaths = array_merge(array_column($mobileItems, 1), ['analytics.php']);
$mobileMoreItems = array_values(array_filter($navigation, static fn (array $item): bool => !in_array($item[1], $mobilePrimaryPaths, true)));

parse_str((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_QUERY), $navigationQuery);
$isActive = static function (string $href) use ($requestPath, $navigationQuery): bool {
    $needle = '/' . strtolower((string) parse_url($href, PHP_URL_PATH));
    if (!str_ends_with($requestPath, $needle)) {
        return false;
    }
    parse_str((string) parse_url($href, PHP_URL_QUERY), $linkQuery);
    if (isset($linkQuery['view'])) {
        $currentView = ($navigationQuery['view'] ?? '') === 'growth' ? 'growth' : 'health';
        return $linkQuery['view'] === $currentView;
    }
    return true;
};
?>
<aside class="app-sidebar d-none d-lg-flex" aria-label="Application sidebar">
    <a class="app-brand sidebar-brand" href="<?= e(url('dashboard.php')) ?>" aria-label="ManGROOVES dashboard">
        <?php require APP_ROOT . '/app/Views/partials/brand.php'; ?>
    </a>

    <nav class="sidebar-nav" aria-label="Workspace navigation">
        <span class="sidebar-section-label">Workspace</span>
        <?php foreach ($navigation as $navigationItem): ?>
            <?php [$label, $href, $icon] = $navigationItem; ?>
            <?php if (isset($navigationItem[3])): ?>
                <?php $groupActive = $isActive($href) || $isActive('clusters.php'); ?>
                <details class="analytics-nav" open>
                    <summary class="analytics-nav-heading <?= $groupActive ? 'is-current' : '' ?>">
                        <i class="bi bi-caret-right-fill analytics-nav-arrow" aria-hidden="true"></i>
                        <a class="sidebar-link" href="<?= e(url($href)) ?>" <?= $isActive($href) ? 'aria-current="page"' : '' ?>><i class="bi <?= e($icon) ?>" aria-hidden="true"></i><span><?= e($label) ?></span></a>
                    </summary>
                    <div class="analytics-nav-children">
                        <?php foreach ($navigationItem[3] as [$childLabel, $childHref, $childIcon]): ?>
                            <a class="sidebar-link <?= $isActive($childHref) ? 'active' : '' ?>" href="<?= e(url($childHref)) ?>" <?= $isActive($childHref) ? 'aria-current="page"' : '' ?>><i class="bi <?= e($childIcon) ?>" aria-hidden="true"></i><span><?= e($childLabel) ?></span></a>
                        <?php endforeach; ?>
                    </div>
                </details>
            <?php else: ?>
                <a class="sidebar-link <?= $isActive($href) ? 'active' : '' ?>" href="<?= e(url($href)) ?>" <?= $isActive($href) ? 'aria-current="page"' : '' ?>><i class="bi <?= e($icon) ?>" aria-hidden="true"></i><span><?= e($label) ?></span></a>
            <?php endif; ?>
        <?php endforeach; ?>

    </nav>

    <div class="sidebar-footer">
        <a class="sidebar-link" href="<?= e(defined('MANGROOVES_CLOUD') ? url('downloads/ManGROOVES-Supabase.apk') : 'https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk') ?>" download="ManGROOVES-Supabase.apk">
            <i class="bi bi-download" aria-hidden="true"></i><span>Download Android APK</span>
        </a>
    </div>
</aside>
