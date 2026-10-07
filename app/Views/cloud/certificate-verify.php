<?php declare(strict_types=1); ?>
<section class="container py-5" style="max-width:720px">
    <div class="card p-4 p-md-5">
        <p class="text-uppercase fw-bold text-success">ManGROOVES</p>
        <h1 class="h2"><?= $certificate ? 'Certificate verified' : 'Certificate unavailable' ?></h1>
        <?php if ($certificate): ?>
            <p>This recognition is recorded in ManGROOVES.</p>
            <dl class="row mt-3">
                <dt class="col-sm-4">Presented to</dt><dd class="col-sm-8"><?= e($certificate['recipient']) ?></dd>
                <dt class="col-sm-4">Achievement</dt><dd class="col-sm-8"><?= e($certificate['badge_name']) ?></dd>
                <dt class="col-sm-4">Awarded</dt><dd class="col-sm-8"><?= e(substr((string)$certificate['earned_at'], 0, 10)) ?></dd>
                <dt class="col-sm-4">Certificate</dt><dd class="col-sm-8" style="overflow-wrap:anywhere"><?= e($certificate['certificate_code']) ?></dd>
            </dl>
        <?php else: ?>
            <p><?= e($verificationError ?: 'Check the QR code or certificate link and try again.') ?></p>
        <?php endif; ?>
        <a class="btn btn-outline-success align-self-start mt-3" href="<?= e(url('index.php')) ?>">ManGROOVES home</a>
    </div>
</section>
