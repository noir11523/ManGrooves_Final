<?php $isHomeNavigation = ($viewName ?? '') === 'home'; ?>
<nav class="navbar <?= $isHomeNavigation ? 'navbar-expand-xxl' : 'navbar-expand-lg' ?> public-navbar sticky-top" aria-label="Primary navigation">
    <div class="container">
        <a class="navbar-brand app-brand" href="<?= e(url('index.php')) ?>" aria-label="ManGROOVES home">
            <?php require APP_ROOT . '/app/Views/partials/brand.php'; ?>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#publicNavigation"
                aria-controls="publicNavigation" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="publicNavigation">
            <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1">
                <li class="nav-item"><a class="nav-link" href="<?= e(url('index.php#about')) ?>">About</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= e(url('index.php#how-it-works')) ?>">How it works</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= e(url('explore.php')) ?>">Explore</a></li>
                <?php if ($isHomeNavigation): ?>
                    <li class="nav-item"><a class="nav-link" href="#for-experts">For experts</a></li>
                    <?php if (!$authUser): ?>
                        <li class="nav-item"><a class="nav-link" href="<?= e(url('login.php')) ?>">Sign in</a></li>
                        <li class="nav-item"><a class="btn btn-primary home-nav-join" href="<?= e(url('register.php')) ?>">Become a Coastal Guardian</a></li>
                    <?php endif; ?>
                <?php endif; ?>
                <?php if ($authUser): ?>
                    <li class="nav-item ms-lg-2">
                        <a class="btn btn-primary rounded-pill px-4" href="<?= e(url('dashboard.php')) ?>">
                            Open dashboard
                        </a>
                    </li>
                <?php endif; ?>
                <li class="nav-item ms-lg-2">
                    <a class="btn btn-outline-secondary btn-sm" href="<?= e(defined('MANGROOVES_CLOUD') ? url('downloads/ManGROOVES-Supabase.apk') : 'https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk') ?>" download="ManGROOVES-Supabase.apk">
                        <i class="bi bi-download me-1" aria-hidden="true"></i> Android APK
                    </a>
                </li>
            </ul>
        </div>
    </div>
</nav>
