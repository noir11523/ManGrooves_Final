<?php $errorUser = Auth::user(); ?>
<section class="error-page">
    <div class="container">
        <div class="error-card">
            <span class="error-code">403</span>
            <span class="error-icon"><i class="bi bi-shield-lock-fill" aria-hidden="true"></i></span>
            <h1>Access not permitted</h1>
            <p>Your account does not have permission to open this area. If you think this is a mistake, contact a system administrator.</p>
            <a class="btn btn-primary" href="<?= e(url($errorUser ? 'dashboard.php' : 'index.php')) ?>"><i class="bi bi-house-door me-1" aria-hidden="true"></i> Return to <?= $errorUser ? 'dashboard' : 'home' ?></a>
        </div>
    </div>
</section>
