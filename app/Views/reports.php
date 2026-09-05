<?php

declare(strict_types=1);

$pageScripts = '<script src="' . e(asset('js/maps.js')) . '"></script>';
$isGuardian = $user['role'] === 'guardian';
?>

<section class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
    <div>
        <h1 class="h2 mb-1"><?= $isGuardian ? 'My report history' : 'Community reports' ?></h1>
        <p class="text-body-secondary mb-0"><?= number_format($results['total']) ?> report<?= $results['total'] === 1 ? '' : 's' ?> found.</p>
    </div>
    <?php if ($isGuardian): ?><a class="btn btn-success" href="<?= e(url('submit-report.php')) ?>"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>New report</a><?php endif; ?>
</section>

<form class="card border-0 shadow-sm mb-4" method="get" role="search">
    <div class="card-body row g-3 align-items-end">
        <div class="col-lg-5">
            <label class="form-label" for="q">Search</label>
            <input class="form-control" type="search" id="q" name="q" value="<?= e($filters['q']) ?>" placeholder="Report code, cluster, species, or place">
        </div>
        <div class="col-sm-5 col-lg-2">
            <label class="form-label" for="status">Verification</label>
            <select class="form-select" id="status" name="status">
                <option value="">All states</option>
                <?php foreach (['pending' => 'Pending', 'verified' => 'Verified', 'rejected' => 'Rejected'] as $value => $label): ?>
                    <option value="<?= e($value) ?>" <?= $filters['status'] === $value ? 'selected' : '' ?>><?= e($label) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-sm-5 col-lg-2">
            <label class="form-label" for="health">Health</label>
            <select class="form-select" id="health" name="health">
                <option value="">All health</option>
                <?php foreach (['Healthy', 'Stressed', 'At Risk'] as $value): ?><option value="<?= e($value) ?>" <?= $filters['health'] === $value ? 'selected' : '' ?>><?= e($value) ?></option><?php endforeach; ?>
            </select>
        </div>
        <div class="col-sm-2 col-lg-3 d-flex gap-2">
            <button class="btn btn-success" type="submit">Filter</button>
            <a class="btn btn-outline-secondary" href="<?= e(url('reports.php')) ?>">Clear</a>
        </div>
    </div>
</form>

<div class="card border-0 shadow-sm" data-report-table data-detail-url="<?= e(url('api/report-detail.php')) ?>" data-open-report="<?= e($openReportId ?: '') ?>">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Report</th><?php if (!$isGuardian): ?><th>Guardian</th><?php endif; ?><th>Site</th><th>Health</th><th>State</th><th>Submitted</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
                <?php if (!$results['items']): ?><tr><td colspan="<?= $isGuardian ? 6 : 7 ?>" class="text-center text-body-secondary py-5">No reports match these filters.</td></tr><?php endif; ?>
                <?php foreach ($results['items'] as $report): ?>
                    <tr>
                        <td><strong><?= e($report['report_code']) ?></strong><?php if ($report['parent_report_id']): ?><div class="small text-body-secondary"><i class="bi bi-arrow-repeat" aria-hidden="true"></i> Follow-up</div><?php endif; ?></td>
                        <?php if (!$isGuardian): ?><td><?= e($report['guardian_name']) ?></td><?php endif; ?>
                        <td><?= e($report['cluster_name'] ?: $report['sitio_name'] ?: 'New site') ?><div class="small text-body-secondary"><?= e($report['species_name'] ?: 'Identification pending') ?></div></td>
                        <td><span class="badge <?= e(health_class((string) $report['display_health'])) ?>"><?= e($report['display_health']) ?></span></td>
                        <td><span class="badge <?= e(report_status_class((string) $report['status'])) ?>"><?= e(ucfirst((string) $report['status'])) ?></span><?php if ($report['needs_attention']): ?><span class="badge text-bg-danger ms-1">Attention</span><?php endif; ?></td>
                        <td><time datetime="<?= e($report['submitted_at']) ?>"><?= e(format_datetime((string) $report['submitted_at'], 'M j, Y')) ?></time></td>
                        <td><button class="btn btn-sm btn-outline-success" type="button" data-view-report="<?= (int) $report['id'] ?>">View</button></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php if ($results['pages'] > 1): ?>
    <nav class="mt-4" aria-label="Report history pages"><ul class="pagination justify-content-center">
        <?php for ($number = 1; $number <= $results['pages']; $number++): ?>
            <li class="page-item <?= $number === $results['page'] ? 'active' : '' ?>"><a class="page-link" href="?<?= e(query_string(['page' => $number, 'id' => null])) ?>"><?= $number ?></a></li>
        <?php endfor; ?>
    </ul></nav>
<?php endif; ?>

<div class="modal fade" id="reportDetailModal" tabindex="-1" aria-labelledby="reportDetailTitle" aria-hidden="true" data-report-modal>
    <div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content">
        <div class="modal-header"><h2 class="modal-title h5" id="reportDetailTitle">Report details</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
        <div class="modal-body" data-report-modal-body><div class="text-center py-5"><div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading…</span></div></div></div>
    </div></div>
</div>
