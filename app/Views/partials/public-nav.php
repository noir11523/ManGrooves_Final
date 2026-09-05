<?php
$currentScript = basename((string) ($_SERVER['SCRIPT_NAME'] ?? 'index.php'));
?>
<nav class="navbar navbar-expand-lg public-navbar sticky-top" aria-label="Primary navigation">
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
                <li class="nav-item"><a class="nav-link <?= $currentScript === 'index.php' ? 'active' : '' ?>" href="<?= e(url('index.php#about')) ?>">About</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= e(url('index.php#how-it-works')) ?>">How it works</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= e(url('explore.php')) ?>">Explore</a></li>
                <?php if ($authUser): ?>
                    <li class="nav-item ms-lg-2">
                        <a class="btn btn-primary rounded-pill px-4" href="<?= e(url('dashboard.php')) ?>">
                            Open dashboard
                        </a>
                    </li>
                <?php else: ?>
                    <li class="nav-item ms-lg-2"><a class="nav-link" href="<?= e(url('login.php')) ?>">Sign in</a></li>
                    <li class="nav-item"><a class="btn btn-primary rounded-pill px-4" href="<?= e(url('register.php')) ?>">Join as guardian</a></li>
                <?php endif; ?>
                <li class="nav-item ms-lg-2">
                    <button class="btn btn-outline-secondary btn-sm d-none" type="button" data-install-app>
                        <i class="bi bi-download me-1" aria-hidden="true"></i> Install app
                    </button>
                </li>
            </ul>
        </div>
    </div>
</nav>
