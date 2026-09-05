<footer class="public-footer">
    <div class="container">
        <div class="row g-4 align-items-start">
            <div class="col-lg-5">
                <a class="app-brand footer-brand" href="<?= e(url('index.php')) ?>">
                    <?php require APP_ROOT . '/app/Views/partials/brand.php'; ?>
                </a>
                <p class="mt-3 mb-0">Helping communities turn careful observation into healthier mangrove forests.</p>
            </div>
            <div class="col-6 col-lg-3">
                <h2 class="footer-heading">Explore</h2>
                <ul class="footer-links">
                    <li><a href="<?= e(url('index.php#about')) ?>">About the project</a></li>
                    <li><a href="<?= e(url('index.php#how-it-works')) ?>">How reporting works</a></li>
                    <li><a href="<?= e(url('explore.php')) ?>">Species map</a></li>
                    <li><a href="<?= e(url('privacy.php')) ?>">Privacy notice</a></li>
                </ul>
            </div>
            <div class="col-6 col-lg-3">
                <h2 class="footer-heading">Participate</h2>
                <ul class="footer-links">
                    <li><a href="<?= e(url('register.php')) ?>">Become a guardian</a></li>
                    <li><a href="<?= e(url('login.php')) ?>">Sign in</a></li>
                    <li><button class="footer-link-button d-none" type="button" data-install-app>Install the app</button></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <span>&copy; <?= e(date('Y')) ?> ManGROOVES</span>
            <span>Built for community-led coastal conservation.</span>
        </div>
    </div>
</footer>
