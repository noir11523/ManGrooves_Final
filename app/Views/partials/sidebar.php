<?php
$role = (string) ($authUser['role'] ?? 'guardian');
$requestPath = strtolower(str_replace('\\', '/', (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH)));
$admin = $role === 'system_admin';
$guardian = $role === 'guardian';
$roleLabel = $admin ? 'Administrator' : ($guardian ? 'Coastal Guardian' : 'Expert');
$navigation = [
    ['Dashboard', 'dashboard.php', 'bi-grid-1x2-fill'],
    ['Reports & Monitoring', '', 'bi-journal-text', [
        [$guardian ? 'My reports' : 'All reports', 'reports.php', 'bi-journal-text'],
        ...(!$admin ? [['Submit report', 'submit-report.php', 'bi-camera-fill']] : []),
        ['Report map', 'report-map.php', 'bi-map'],
        ['Mangrove timeline', 'clusters.php', 'bi-clock-history'],
        ...($guardian ? [['Explore mangrove sites', 'explore.php', 'bi-tree']] : []),
    ]],
    ['Analytics', 'analytics.php', 'bi-bar-chart-fill'],
];
if (!$guardian) $navigation[] = ['Mangrove Data', '', 'bi-tree-fill', [
    ['Species & sites', 'admin/species.php', 'bi-tree'],
    ...($admin ? [['Health checklist', 'admin/checklist.php', 'bi-list-check']] : []),
]];
if ($admin) $navigation = array_merge($navigation, [
    ['User Management', '', 'bi-people-fill', [['All users', 'admin/users.php', 'bi-people'], ['Expert applications', 'admin/expert-applications.php', 'bi-person-check']]],
    ['Recognition', '', 'bi-award-fill', [['Badges', 'admin/badges.php', 'bi-award'], ['Certificates', 'admin/certificate-settings.php', 'bi-file-earmark-check']]],
    ['System Management', '', 'bi-shield-lock-fill', [['Audit logs', 'admin/audit.php', 'bi-shield-check']]],
]);
else $navigation[] = ['My badges', 'badges.php', 'bi-award-fill'];
$mobileItems = $guardian
    ? [['Home','dashboard.php','bi-house-door-fill'],['Reports','reports.php','bi-journal-text'],['Submit','submit-report.php','bi-camera-fill'],['Badges','badges.php','bi-award-fill']]
    : [['Home','dashboard.php','bi-house-door-fill'],['Reports','reports.php','bi-journal-text'],['Map','report-map.php','bi-map'],['Analytics','analytics.php','bi-bar-chart-fill']];
$mobilePrimaryPaths = array_column($mobileItems, 1);
$mobileMoreItems = [];
foreach ($navigation as $item) {
    if (isset($item[3])) {
        $item[3] = array_values(array_filter($item[3], static fn (array $child): bool => !in_array($child[1], $mobilePrimaryPaths, true)));
        if ($item[3]) $mobileMoreItems[] = $item;
    } elseif (!in_array($item[1], $mobilePrimaryPaths, true)) $mobileMoreItems[] = $item;
}

parse_str((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_QUERY), $navigationQuery);
$isActive = static function (string $href) use ($requestPath, $navigationQuery): bool {
    if ($href === 'reports.php' && (str_ends_with($requestPath,'/admin/verification.php') || str_ends_with($requestPath,'/admin/validation-history.php') || str_ends_with($requestPath,'/report-detail.php'))) return true;
    if ($href === 'clusters.php' && str_ends_with($requestPath,'/cluster.php')) return true;
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
        <span class="sidebar-section-label">Overview</span>
        <?php foreach ($navigation as $index => $navigationItem): ?>
            <?php [$label, $href, $icon] = $navigationItem; ?>
            <?php if ($index === 1): ?><span class="sidebar-section-label">Mangrove monitoring</span><?php endif; ?>
            <?php if ($label === 'User Management'): ?><span class="sidebar-section-label">Administration</span><?php endif; ?>
            <?php if (isset($navigationItem[3])): ?>
                <?php $groupActive = (bool) array_filter($navigationItem[3], static fn (array $child): bool => $isActive($child[1])); ?>
                <details class="analytics-nav nav-group" <?= $groupActive ? 'open' : '' ?>>
                    <summary class="analytics-nav-heading sidebar-link <?= $groupActive ? 'is-current' : '' ?>"><i class="bi <?= e($icon) ?>" aria-hidden="true"></i><span><?= e($label) ?></span><i class="bi bi-chevron-right analytics-nav-arrow" aria-hidden="true"></i></summary>
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
            <i class="bi bi-download" aria-hidden="true"></i><span>Android app</span>
        </a>
    </div>
</aside>
