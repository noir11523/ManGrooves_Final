<?php

declare(strict_types=1);

$extraHead = '<style>@media print{.app-sidebar,.app-topbar,.mobile-nav,.no-print,.offline-banner{display:none!important}.app-stage,.app-main{margin:0!important;padding:0!important}.certificate-sheet{box-shadow:none!important;border:8px double #2D5A27!important;min-height:95vh}}.certificate-sheet{max-width:980px;margin:auto;border:8px double #2D5A27;background:#fff}</style>';
?>
<?php if (!$guardian): ?>
    <section class="text-center py-5"><h1 class="h3">Guardian not found</h1><a class="btn btn-success" href="<?= e(url('dashboard.php')) ?>">Dashboard</a></section>
<?php else: ?>
    <div class="text-end mb-3 no-print"><button class="btn btn-success" type="button" onclick="window.print()"><i class="bi bi-printer me-2" aria-hidden="true"></i>Print / Save as PDF</button></div>
    <article class="certificate-sheet shadow-sm p-4 p-md-5 text-center">
        <p class="text-uppercase text-success fw-bold letter-spacing mb-2">ManGROOVES Community Monitoring</p>
        <h1 class="display-5 fw-semibold">Certificate of Stewardship</h1>
        <p class="lead mt-4 mb-2">This certificate recognizes</p>
        <p class="display-6 text-success fw-bold border-bottom d-inline-block px-4 pb-2"><?= e($guardian['full_name']) ?></p>
        <p class="lead mx-auto" style="max-width:720px">for verified contributions to community mangrove monitoring<?= $guardian['barangay_name'] ? ' in Barangay ' . e($guardian['barangay_name']) : '' ?>.</p>
        <div class="row g-3 justify-content-center my-4"><div class="col-6 col-md-3"><div class="border rounded p-3"><div class="h3 mb-0"><?= number_format((int) ($metrics['verified_reports'] ?? 0)) ?></div><small>verified reports</small></div></div><div class="col-6 col-md-3"><div class="border rounded p-3"><div class="h3 mb-0"><?= number_format((int) ($metrics['verified_followups'] ?? 0)) ?></div><small>follow-ups</small></div></div><div class="col-6 col-md-3"><div class="border rounded p-3"><div class="h3 mb-0"><?= number_format((int) ($metrics['distinct_species'] ?? 0)) ?></div><small>species</small></div></div></div>
        <h2 class="h5">Earned recognition</h2><div class="d-flex flex-wrap justify-content-center gap-2 mb-4"><?php if (!$badges): ?><span class="text-body-secondary">No badge earned yet</span><?php endif; ?><?php foreach ($badges as $badge): ?><span class="badge rounded-pill text-bg-success fs-6 px-3 py-2"><i class="bi bi-award me-1" aria-hidden="true"></i><?= e($badge['badge_name']) ?></span><?php endforeach; ?></div>
        <p class="small text-body-secondary mb-0">Generated <?= e(date('F j, Y')) ?> · Certificate reference MGR-G<?= (int) $guardian['id'] ?>-<?= e(date('Ymd')) ?></p>
    </article>
<?php endif; ?>
