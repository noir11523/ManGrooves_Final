<nav class="mobile-bottom-nav d-lg-none" aria-label="Mobile workspace navigation">
    <?php foreach ($mobileItems as [$label, $href, $icon]): ?>
        <?php $active = $isActive($href); ?>
        <a class="mobile-nav-link <?= $active ? 'active' : '' ?>" href="<?= e(url($href)) ?>" <?= $active ? 'aria-current="page"' : '' ?>>
            <i class="bi <?= e($icon) ?>" aria-hidden="true"></i><span><?= e($label) ?></span>
        </a>
    <?php endforeach; ?>
</nav>
