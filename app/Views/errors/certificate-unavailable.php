<?php declare(strict_types=1); ?>
<section class="error-page">
    <div class="container">
        <div class="error-card">
            <span class="error-code"><i class="bi bi-award" aria-hidden="true"></i></span>
            <h1>Certificate not yet available</h1>
            <p>A stewardship certificate becomes available after the guardian earns at least one badge from verified contributions.</p>
            <a class="btn btn-primary" href="<?= e(url(($viewer['role'] ?? '') === 'guardian' ? 'badges.php' : 'dashboard.php')) ?>">Return to <?= ($viewer['role'] ?? '') === 'guardian' ? 'badges' : 'dashboard' ?></a>
        </div>
    </div>
</section>
