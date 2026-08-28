<?php $errorUser = Auth::user(); ?>
<section class="error-page">
    <div class="container">
        <div class="error-card">
            <span class="error-code">404</span>
            <span class="error-icon"><i class="bi bi-signpost-split-fill" aria-hidden="true"></i></span>
            <h1>We could not find that page</h1>
            <p>The address may be outdated, or the page may have moved. Return to a known area and continue from there.</p>
            <div class="d-flex flex-wrap justify-content-center gap-2">
                <button class="btn btn-outline-primary" type="button" data-history-back><i class="bi bi-arrow-left me-1" aria-hidden="true"></i> Go back</button>
                <a class="btn btn-primary" href="<?= e(url($errorUser ? 'dashboard.php' : 'index.php')) ?>">Return to <?= $errorUser ? 'dashboard' : 'home' ?></a>
            </div>
        </div>
    </div>
</section>
