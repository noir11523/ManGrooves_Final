<?php

declare(strict_types=1);

$role = (string) $user['role'];
$isGuardian = $role === 'guardian';
$extraHead = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">';
$pageScripts = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>'
    . '<script src="' . e(asset('js/maps.js')) . '"></script>';
$statCards = $isGuardian
    ? [
        ['label' => 'Verified', 'value' => $stats['verified_reports'] ?? 0, 'icon' => 'bi-patch-check', 'tone' => 'success'],
        ['label' => 'Pending', 'value' => $stats['pending_reports'] ?? 0, 'icon' => 'bi-hourglass-split', 'tone' => 'warning'],
        ['label' => 'Clusters covered', 'value' => $stats['clusters_covered'] ?? 0, 'icon' => 'bi-geo-alt', 'tone' => 'primary'],
        ['label' => 'Species identified', 'value' => $stats['species_identified'] ?? 0, 'icon' => 'bi-tree', 'tone' => 'info'],
    ]
    : [
        ['label' => 'Pending review', 'value' => $stats['pending_reports'] ?? 0, 'icon' => 'bi-inbox', 'tone' => 'warning'],
        ['label' => 'Verified', 'value' => $stats['verified_reports'] ?? 0, 'icon' => 'bi-patch-check', 'tone' => 'success'],
        ['label' => 'Needs attention', 'value' => $stats['needs_attention'] ?? 0, 'icon' => 'bi-exclamation-triangle', 'tone' => 'danger'],
        ['label' => 'Active guardians', 'value' => $stats['active_guardians'] ?? 0, 'icon' => 'bi-people', 'tone' => 'primary'],
    ];
?>

<section class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
    <div>
        <p class="text-uppercase text-success fw-semibold small mb-1"><?= $isGuardian ? 'Guardian workspace' : ($role === 'expert' ? 'Expert workspace' : 'System administration') ?></p>
        <h1 class="h2 mb-1">Welcome, <?= e(explode(' ', trim((string) $user['full_name']))[0] ?: $user['full_name']) ?></h1>
        <p class="text-body-secondary mb-0">
            <?= $isGuardian ? 'Monitor your community’s mangroves and keep follow-ups on schedule.' : 'Review community evidence and track the condition of monitored clusters.' ?>
        </p>
    </div>
    <?php if ($isGuardian): ?>
        <a class="btn btn-success btn-lg" href="<?= e(url('submit-report.php')) ?>"><i class="bi bi-camera me-2" aria-hidden="true"></i>New report</a>
    <?php elseif ($role === 'expert'): ?>
        <a class="btn btn-success" href="<?= e(url('admin/verification.php')) ?>"><i class="bi bi-clipboard-check me-2" aria-hidden="true"></i>Open verification queue</a>
    <?php else: ?>
        <a class="btn btn-success" href="<?= e(url('admin/analytics.php')) ?>"><i class="bi bi-bar-chart me-2" aria-hidden="true"></i>View analytics</a>
    <?php endif; ?>
</section>

<section class="row g-3 mb-4" aria-label="Report summary">
    <?php foreach ($statCards as $card): ?>
        <div class="col-6 col-xl-3">
            <article class="card h-100 border-0 shadow-sm">
                <div class="card-body d-flex align-items-center gap-3">
                    <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-<?= e($card['tone']) ?>-subtle text-<?= e($card['tone']) ?> fs-4" style="width:3rem;height:3rem">
                        <i class="bi <?= e($card['icon']) ?>" aria-hidden="true"></i>
                    </span>
                    <div><div class="h3 mb-0"><?= number_format((int) $card['value']) ?></div><div class="small text-body-secondary"><?= e($card['label']) ?></div></div>
                </div>
            </article>
        </div>
    <?php endforeach; ?>
</section>

<?php if ($isGuardian && $reminders): ?>
    <section class="mb-4" aria-labelledby="followup-heading">
        <div class="d-flex align-items-center justify-content-between mb-2">
            <h2 class="h4 mb-0" id="followup-heading">Follow-up reminders</h2>
            <span class="badge text-bg-warning"><?= count($reminders) ?> due</span>
        </div>
        <div class="row g-3">
            <?php foreach ($reminders as $reminder): ?>
                <?php $overdue = $reminder['due_state'] === 'overdue'; ?>
                <div class="col-lg-6">
                    <article class="alert <?= $overdue ? 'alert-danger' : 'alert-warning' ?> mb-0 h-100">
                        <div class="d-flex justify-content-between gap-3 align-items-start">
                            <div>
                                <h3 class="h6 mb-1"><?= e($reminder['cluster_name']) ?></h3>
                                <p class="mb-0 small">
                                    <?= $overdue
                                        ? 'Overdue by ' . number_format(abs((int) $reminder['days_until_due'])) . ' day(s)'
                                        : 'Due ' . ((int) $reminder['days_until_due'] === 0 ? 'today' : 'in ' . (int) $reminder['days_until_due'] . ' day(s)') ?>
                                </p>
                            </div>
                            <a class="btn btn-sm <?= $overdue ? 'btn-danger' : 'btn-warning' ?>" href="<?= e(url('submit-report.php?parent=' . $reminder['id'])) ?>">Submit follow-up</a>
                        </div>
                    </article>
                </div>
            <?php endforeach; ?>
        </div>
    </section>
<?php endif; ?>

<div class="row g-4">
    <section class="col-xl-7" aria-labelledby="map-heading">
        <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 class="h5 mb-0" id="map-heading">Cluster health map</h2>
                <a class="small" href="<?= e(url('explore.php')) ?>">Explore all</a>
            </div>
            <div class="card-body p-0">
                <div class="rounded-bottom" style="min-height:390px" data-cluster-map data-clusters-url="<?= e(url('api/clusters.php')) ?>" aria-label="Map of monitored mangrove clusters"></div>
            </div>
        </div>
    </section>

    <section class="col-xl-5" aria-labelledby="latest-heading">
        <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 class="h5 mb-0" id="latest-heading">Latest reports</h2>
                <a class="small" href="<?= e(url('reports.php')) ?>">View history</a>
            </div>
            <div class="list-group list-group-flush">
                <?php if (!$latestReports): ?>
                    <div class="card-body text-center text-body-secondary py-5">No reports yet.</div>
                <?php endif; ?>
                <?php foreach ($latestReports as $report): ?>
                    <a class="list-group-item list-group-item-action py-3" href="<?= e(url('reports.php?id=' . $report['id'])) ?>">
                        <div class="d-flex justify-content-between gap-2">
                            <strong><?= e($report['report_code']) ?></strong>
                            <span class="badge <?= e(report_status_class((string) $report['status'])) ?>"><?= e(ucfirst((string) $report['status'])) ?></span>
                        </div>
                        <div class="small text-body-secondary mt-1"><?= e($report['cluster_name'] ?: $report['species_name'] ?: 'New observation site') ?></div>
                        <div class="small mt-1"><span class="badge <?= e(health_class((string) $report['display_health'])) ?>"><?= e($report['display_health']) ?></span> · <?= e(format_datetime((string) $report['submitted_at'], 'M j, Y')) ?></div>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
</div>
