<nav class="mobile-bottom-nav d-lg-none" aria-label="Mobile workspace navigation">
    <?php foreach ($mobileItems as [$label, $href, $icon]): ?>
        <?php $active = $isActive($href); ?>
        <a class="mobile-nav-link <?= $active ? 'active' : '' ?>" href="<?= e(url($href)) ?>" <?= $active ? 'aria-current="page"' : '' ?>>
            <i class="bi <?= e($icon) ?>" aria-hidden="true"></i><span><?= e($label) ?></span>
        </a>
    <?php endforeach; ?>
        <?php if ($mobileMoreItems): ?>
        <div class="dropup mobile-more">
            <button class="mobile-nav-link" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Open menu"><i class="bi bi-list" aria-hidden="true"></i><span>Menu</span></button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="max-height:75vh;overflow:auto">
                <?php foreach ($mobileMoreItems as $entry): ?>
                    <li><a class="dropdown-item" href="<?= e(url($entry[1])) ?>"><?= e($entry[0]) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>
</nav>
