<?php
$filters = $analytics['filters'];
$verification = $analytics['verification'];
$health = $analytics['health'];
$canViewSurvival = ($currentUser['role'] ?? '') === 'system_admin';
$overallSurvival = $canViewSurvival ? $analytics['overall_survival'] : null;
$staticHealthPath = APP_ROOT . '/public/generated/analytics/health-distribution.png';
$staticSurvivalPath = APP_ROOT . '/public/generated/analytics/survival-trend.png';
$hasStaticCharts = $canViewSurvival && is_file($staticHealthPath) && is_file($staticSurvivalPath);
$staticChartVersion = $hasStaticCharts ? (string) max((int) filemtime($staticHealthPath), (int) filemtime($staticSurvivalPath)) : '1';
$staticSummary = null;
$staticSummaryPath = APP_ROOT . '/public/generated/analytics/summary.json';
if (is_file($staticSummaryPath)) {
    $decodedSummary = json_decode((string) file_get_contents($staticSummaryPath), true);
    $staticSummary = is_array($decodedSummary) ? $decodedSummary : null;
}
$clientData = [
    'capabilities' => ['canViewSurvival' => $canViewSurvival],
    'health' => ['labels' => array_keys($health), 'values' => array_values($health)],
    'growth' => [
        'labels' => array_column($analytics['growth'], 'month_label'),
        'survival' => $canViewSurvival
            ? array_map(static fn ($value) => $value === null ? null : (float) $value, array_column($analytics['growth'], 'survival_rate'))
            : [],
        'verified' => array_map('intval', array_column($analytics['growth'], 'verified_reports')),
    ],
    'verification' => [
        'labels' => ['Pending', 'Verified', 'Rejected'],
        'values' => [(int) ($verification['pending'] ?? 0), (int) ($verification['verified'] ?? 0), (int) ($verification['rejected'] ?? 0)],
    ],
    'map' => array_map(static function (array $cluster) use ($canViewSurvival): array {
        if (!$canViewSurvival) {
            unset($cluster['survival']);
        }
        return $cluster;
    }, $analytics['map']),
    'clusterUrl' => url('admin/cluster.php?id='),
];
?>
<style>
@media print {
    .no-print, nav, aside, header .navbar { display: none !important; }
    main, .container, .container-fluid { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
    .card { break-inside: avoid; box-shadow: none !important; }
    #analytics-map { height: 360px !important; }
}
</style>
<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div><h1 class="h3 mb-1">Conservation analytics</h1><p class="text-muted mb-0"><?= $canViewSurvival ? "Current survival uses each cluster's latest verified alive count divided by its initial seedlings." : 'Review verified health, monitoring volume, and high-risk locations.' ?></p></div>
    <div class="d-flex flex-wrap gap-2 no-print">
        <?php if (($currentUser['role'] ?? '') === 'system_admin' && is_file(APP_ROOT . '/public/admin/generate-charts.php')): ?>
        <form method="post" action="<?= e(url('admin/generate-charts.php')) ?>">
            <?= Csrf::field() ?>
            <input type="hidden" name="date_from" value="<?= e($filters['date_from']) ?>"><input type="hidden" name="date_to" value="<?= e($filters['date_to']) ?>">
            <?php if ($filters['barangay_id']): ?><input type="hidden" name="barangay_id" value="<?= (int) $filters['barangay_id'] ?>"><?php endif; ?>
            <?php if ($filters['species_id']): ?><input type="hidden" name="species_id" value="<?= (int) $filters['species_id'] ?>"><?php endif; ?>
            <button class="btn btn-outline-success" type="submit">Regenerate chart PNGs</button>
        </form>
        <?php endif; ?>
        <?php if ($canViewSurvival): ?><button class="btn btn-success js-print-analytics" type="button">Print / Save PDF</button><?php endif; ?>
    </div>
</div>

<form class="card card-body mb-4 no-print" method="get" action="<?= e(url('admin/analytics.php')) ?>">
    <div class="row g-3 align-items-end">
        <div class="col-sm-6 col-lg-2"><label class="form-label" for="analytics-from">From</label><input class="form-control" type="date" id="analytics-from" name="date_from" value="<?= e($filters['date_from']) ?>"></div>
        <div class="col-sm-6 col-lg-2"><label class="form-label" for="analytics-to">To</label><input class="form-control" type="date" id="analytics-to" name="date_to" value="<?= e($filters['date_to']) ?>"></div>
        <div class="col-sm-6 col-lg-3"><label class="form-label" for="analytics-barangay">Barangay</label><select class="form-select" id="analytics-barangay" name="barangay_id"><option value="">All barangays</option><?php foreach ($barangays as $barangay): ?><option value="<?= (int) $barangay['id'] ?>" <?= (int) $filters['barangay_id'] === (int) $barangay['id'] ? 'selected' : '' ?>><?= e($barangay['name']) ?></option><?php endforeach; ?></select></div>
        <div class="col-sm-6 col-lg-3"><label class="form-label" for="analytics-species">Species</label><select class="form-select" id="analytics-species" name="species_id"><option value="">All species</option><?php foreach ($species as $item): ?><option value="<?= (int) $item['id'] ?>" <?= (int) $filters['species_id'] === (int) $item['id'] ? 'selected' : '' ?>><?= e($item['common_name']) ?> — <?= e($item['scientific_name']) ?></option><?php endforeach; ?></select></div>
        <div class="col-lg-2 d-flex gap-2"><button class="btn btn-success" type="submit">Apply</button><a class="btn btn-outline-secondary" href="<?= e(url('admin/analytics.php')) ?>">Reset</a></div>
    </div>
</form>

<div class="row g-3 mb-4">
    <?php if ($canViewSurvival): ?><div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">Overall survival</div><div class="display-6"><?= $overallSurvival === null ? 'N/A' : e(number_format($overallSurvival, 1) . '%') ?></div><div class="small text-muted"><?= (int) $analytics['survival_eligible_clusters'] ?> cluster(s) with complete counts</div></div></div></div><?php endif; ?>
    <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">Verified reports</div><div class="display-6 text-success"><?= (int) ($verification['verified'] ?? 0) ?></div><div class="small text-muted"><?= e(number_format((float) $verification['completion_rate'], 1)) ?>% reviewed</div></div></div></div>
    <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">Pending</div><div class="display-6 text-warning"><?= (int) ($verification['pending'] ?? 0) ?></div><div class="small text-muted"><?= e($verification['avg_turnaround_hours'] === null ? 'No turnaround data' : number_format((float) $verification['avg_turnaround_hours'], 1) . ' h average review') ?></div></div></div></div>
    <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">High-risk reports</div><div class="display-6 text-danger"><?= (int) $analytics['high_risk_total'] ?></div><div class="small text-muted"><?= e(number_format((float) $verification['correction_rate'], 1)) ?>% correction rate</div></div></div></div>
</div>

<div class="row g-4 mb-4">
    <div class="col-lg-4"><div class="card h-100"><div class="card-header"><h2 class="h5 mb-0">Health distribution</h2></div><div class="card-body"><canvas id="health-chart" aria-label="Health distribution chart"></canvas></div></div></div>
    <div class="col-lg-8"><div class="card h-100"><div class="card-header"><h2 class="h5 mb-0"><?= $canViewSurvival ? 'Survival and verified-report trend' : 'Verified-report trend' ?></h2></div><div class="card-body"><canvas id="growth-chart" aria-label="<?= $canViewSurvival ? 'Monthly survival and verified report trend chart' : 'Monthly verified report trend chart' ?>"></canvas></div></div></div>
</div>

<?php if ($hasStaticCharts): ?>
<section class="card mb-4 no-print" aria-labelledby="static-analytics-title">
    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
            <h2 class="h5 mb-1" id="static-analytics-title">Generated analytics snapshots</h2>
            <p class="small text-muted mb-0">All-time Python/pandas snapshots across every verified record. These are intentionally excluded from filtered printouts.</p>
        </div>
        <?php if (!empty($staticSummary['generated_at'])): ?>
            <span class="small text-muted">Generated <?= e(format_datetime((string) $staticSummary['generated_at'])) ?></span>
        <?php endif; ?>
    </div>
    <div class="card-body">
        <div class="row g-4">
            <div class="col-lg-5">
                <img class="img-fluid rounded border" src="<?= e(url('generated/analytics/health-distribution.png?v=' . rawurlencode($staticChartVersion))) ?>" alt="Generated pie chart of verified mangrove health distribution" loading="lazy">
            </div>
            <div class="col-lg-7">
                <img class="img-fluid rounded border" src="<?= e(url('generated/analytics/survival-trend.png?v=' . rawurlencode($staticChartVersion))) ?>" alt="Generated line chart of verified survival trends over time" loading="lazy">
            </div>
        </div>
    </div>
</section>
<?php endif; ?>

<div class="card mb-4"><div class="card-header d-flex justify-content-between"><h2 class="h5 mb-0">Cluster map</h2><span class="small text-muted">Click a marker for its timeline</span></div><div id="analytics-map" style="height:480px"></div></div>

<?php if ($canViewSurvival): ?><div class="card mb-4">
    <div class="card-header"><h2 class="h5 mb-0">Cluster survival</h2></div>
    <div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Cluster</th><th>Barangay</th><th>Species</th><th>Current health</th><th class="text-end">Initial</th><th class="text-end">Latest alive</th><th class="text-end">Survival</th></tr></thead><tbody>
    <?php foreach ($analytics['clusters'] as $cluster): ?><tr><td><a href="<?= e(url('admin/cluster.php?id=' . $cluster['id'])) ?>"><?= e($cluster['cluster_code']) ?></a><div class="small text-muted"><?= e($cluster['name']) ?></div></td><td><?= e($cluster['barangay_name']) ?></td><td><?= e($cluster['common_name'] ?: ($cluster['scientific_name'] ?: 'Unassigned')) ?></td><td><span class="badge <?= e(health_class($cluster['final_health'] ?: $cluster['latest_health'])) ?>"><?= e($cluster['final_health'] ?: $cluster['latest_health']) ?></span></td><td class="text-end"><?= number_format((int) $cluster['initial_seedlings']) ?></td><td class="text-end"><?= $cluster['observed_alive_count'] === null ? '—' : number_format((int) $cluster['observed_alive_count']) ?></td><td class="text-end"><strong><?= $cluster['survival_rate'] === null ? 'N/A' : e(number_format((float) $cluster['survival_rate'], 1) . '%') ?></strong></td></tr><?php endforeach; ?>
    <?php if ($analytics['clusters'] === []): ?><tr><td colspan="7" class="text-center text-muted py-4">No clusters match these filters.</td></tr><?php endif; ?>
    </tbody></table></div>
</div><?php endif; ?>

<div class="card mb-4">
    <div class="card-header"><h2 class="h5 mb-0">High-risk and attention-flagged reports</h2></div>
    <div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Report</th><th>Cluster</th><th>Barangay</th><th>Species</th><th>Health</th><th>Submitted</th></tr></thead><tbody>
    <?php foreach ($analytics['high_risk'] as $risk): ?><tr><td><a href="<?= e(url('admin/report.php?id=' . $risk['id'])) ?>"><?= e($risk['report_code']) ?></a><?php if ((int) $risk['needs_attention'] === 1): ?> <span class="badge text-bg-danger">Attention</span><?php endif; ?></td><td><?= $risk['cluster_id'] ? '<a href="' . e(url('admin/cluster.php?id=' . $risk['cluster_id'])) . '">' . e($risk['cluster_name']) . '</a>' : 'Unassigned' ?></td><td><?= e($risk['barangay_name']) ?></td><td><?= e($risk['species_name'] ?: 'Unassigned') ?></td><td><span class="badge <?= e(health_class($risk['final_health'])) ?>"><?= e($risk['final_health']) ?></span></td><td><?= e(format_datetime($risk['submitted_at'])) ?></td></tr><?php endforeach; ?>
    <?php if ($analytics['high_risk'] === []): ?><tr><td colspan="6" class="text-center text-muted py-4">No high-risk reports in this period.</td></tr><?php endif; ?>
    </tbody></table></div>
</div>

<div class="card"><div class="card-header"><h2 class="h5 mb-0">Verification quality</h2></div><div class="card-body"><div class="row g-3"><div class="col-sm-4"><div class="text-muted small">Correction rate</div><strong><?= e(number_format((float) $verification['correction_rate'], 1)) ?>%</strong></div><div class="col-sm-4"><div class="text-muted small">Rejection rate</div><strong><?= e(number_format((float) $verification['rejection_rate'], 1)) ?>%</strong></div><div class="col-sm-4"><div class="text-muted small">Average turnaround</div><strong><?= $verification['avg_turnaround_hours'] === null ? 'N/A' : e(number_format((float) $verification['avg_turnaround_hours'], 1) . ' hours') ?></strong></div></div><div class="mt-4"><canvas id="verification-chart" style="max-height:220px"></canvas></div></div></div>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">
<script>window.mangroovesAnalytics = <?= json_encode($clientData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" integrity="sha384-vsrfeLOOY6KuIYKDlmVH5UiBmgIdB1oEf7p01YgWHuqmOHfZr374+odEv96n9tNC" crossorigin="anonymous" defer></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous" defer></script>
<script src="<?= e(asset('js/admin.js')) ?>" defer></script>
