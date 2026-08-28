<?php

declare(strict_types=1);

$extraHead = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">';
$pageScripts = $cluster
    ? '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script><script src="' . e(asset('js/maps.js')) . '"></script>'
    : '';
?>
<?php if (!$cluster): ?>
    <section class="text-center py-5">
        <h1 class="h3">Cluster not found</h1>
        <p class="text-body-secondary">The cluster is outside your monitoring area or no longer exists.</p>
        <a class="btn btn-success" href="<?= e(url('explore.php')) ?>">Back to explore</a>
    </section>
<?php else: ?>
    <div class="mb-3"><a class="small text-decoration-none" href="<?= e(url('explore.php')) ?>"><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Explore</a></div>
    <section class="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
            <p class="text-uppercase text-success small fw-semibold mb-1"><?= e($cluster['cluster_code']) ?></p>
            <h1 class="h2 mb-1"><?= e($cluster['name']) ?></h1>
            <p class="text-body-secondary mb-0"><?= e($cluster['sitio_name'] ?: $cluster['barangay_name']) ?> &middot; <?= e($cluster['barangay_name']) ?></p>
        </div>
        <span class="badge <?= e(health_class((string) $cluster['latest_health'])) ?> fs-6 align-self-start"><?= e($cluster['latest_health']) ?></span>
    </section>
    <div class="row g-4 mb-4">
        <div class="col-lg-7"><div class="card border-0 shadow-sm"><div class="card-body p-0"><div style="min-height:390px" data-single-cluster-map data-lat="<?= e($cluster['center_lat']) ?>" data-lng="<?= e($cluster['center_lng']) ?>" data-name="<?= e($cluster['name']) ?>" data-health="<?= e($cluster['latest_health']) ?>"></div></div></div></div>
        <div class="col-lg-5"><div class="card border-0 shadow-sm h-100"><div class="card-body"><h2 class="h5">Cluster profile</h2><dl class="row mb-0"><dt class="col-6">Primary species</dt><dd class="col-6"><em><?= e($cluster['scientific_name'] ?: 'Unassigned') ?></em></dd><dt class="col-6">Rarity</dt><dd class="col-6"><?= e($cluster['rarity_level']) ?></dd><dt class="col-6">Initial seedlings</dt><dd class="col-6"><?= number_format((int) $cluster['initial_seedlings']) ?></dd><dt class="col-6">Verified reports</dt><dd class="col-6"><?= number_format((int) $cluster['verified_count']) ?></dd><dt class="col-6">Last verified</dt><dd class="col-6"><?= e(format_datetime($cluster['latest_report_at'], 'M j, Y')) ?></dd></dl></div></div></div>
    </div>
    <section aria-labelledby="timeline-title">
        <h2 class="h4 mb-3" id="timeline-title">Verified monitoring timeline</h2>
        <?php if (!$timeline): ?><div class="card border-0 shadow-sm"><div class="card-body text-center text-body-secondary py-5">No verified reports for this cluster yet.</div></div><?php endif; ?>
        <div class="vstack gap-3">
            <?php foreach (array_reverse($timeline) as $entry): ?>
                <article class="card border-0 shadow-sm"><div class="card-body"><div class="row g-3 align-items-center">
                    <?php if (!empty($entry['photo_path'])): ?>
                        <div class="col-sm-3 col-lg-2"><img class="img-fluid rounded" src="<?= e(report_photo_url((int) $entry['id'])) ?>" alt="Evidence from <?= e($entry['report_code']) ?>"></div>
                    <?php endif; ?>
                    <div class="col">
                        <div class="d-flex flex-wrap justify-content-between gap-2">
                            <h3 class="h6 mb-1"><?php if (!empty($entry['can_view_details'])): ?><a href="<?= e(url('report-detail.php?id=' . $entry['id'])) ?>"><?= e($entry['report_code']) ?></a><?php else: ?><?= e($entry['report_code']) ?><?php endif; ?></h3>
                            <time class="small text-body-secondary" datetime="<?= e($entry['verified_at']) ?>"><?= e(format_datetime((string) ($entry['verified_at'] ?: $entry['submitted_at']), 'M j, Y')) ?></time>
                        </div>
                        <p class="mb-1"><span class="badge <?= e(health_class((string) $entry['health'])) ?>"><?= e($entry['health']) ?></span> <em class="ms-2"><?= e($entry['species_name'] ?: 'Species unassigned') ?></em></p>
                        <p class="small mb-0">Observed alive: <?= $entry['observed_alive_count'] !== null ? number_format((int) $entry['observed_alive_count']) : 'not counted' ?><?= $entry['needs_attention'] ? ' &middot; Needs attention' : '' ?></p>
                        <?php if ($entry['expert_feedback']): ?><p class="small text-body-secondary mb-0 mt-2"><?= e($entry['expert_feedback']) ?></p><?php endif; ?>
                    </div>
                </div></div></article>
            <?php endforeach; ?>
        </div>
    </section>
<?php endif; ?>
