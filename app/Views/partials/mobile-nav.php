<?php
$mobileItems = $authUser['role'] === 'guardian'
    ? [
        ['Home', 'dashboard.php', 'bi-house-door-fill'],
        ['Report', 'submit-report.php', 'bi-camera-fill'],
        ['History', 'reports.php', 'bi-journal-text'],
        ['Explore', 'explore.php', 'bi-map-fill'],
    ]
    : [
        ['Home', 'dashboard.php', 'bi-house-door-fill'],
        ['Queue', 'admin/verification.php', 'bi-clipboard2-check-fill'],
        ['Analytics', 'admin/analytics.php', 'bi-bar-chart-fill'],
        ['Clusters', 'admin/cluster.php', 'bi-pin-map-fill'],
    ];
?>
<nav class="mobile-bottom-nav d-lg-none" aria-label="Mobile workspace navigation">
    <?php foreach ($mobileItems as [$label, $href, $icon]): ?>
        <?php $active = str_ends_with($requestPath ?? '', '/' . strtolower($href)); ?>
        <a class="mobile-nav-link <?= $active ? 'active' : '' ?>" href="<?= e(url($href)) ?>" <?= $active ? 'aria-current="page"' : '' ?>>
            <i class="bi <?= e($icon) ?>" aria-hidden="true"></i><span><?= e($label) ?></span>
        </a>
    <?php endforeach; ?>
</nav>
