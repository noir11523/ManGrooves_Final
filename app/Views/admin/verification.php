<?php
$pending = (int) ($summary['pending'] ?? 0);
$verified = (int) ($summary['verified'] ?? 0);
$rejected = (int) ($summary['rejected'] ?? 0);
$verifiedAttention = (int) ($summary['verified_attention'] ?? 0);
?>
<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div>
        <h1 class="h3 mb-1"><?= e($pageTitle) ?></h1>
        <p class="text-muted mb-0">Review field evidence, coach guardians, and maintain a reliable conservation record.</p>
    </div>
    <a class="btn btn-outline-success" href="<?= e(url('admin/analytics.php')) ?>">View analytics</a>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">Pending</div><div class="display-6"><?= $pending ?></div></div></div></div>
    <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">Verified reports needing attention</div><div class="display-6 text-danger"><?= $verifiedAttention ?></div></div></div></div>
    <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">Verified</div><div class="display-6 text-success"><?= $verified ?></div></div></div></div>
    <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body"><div class="text-muted small">Rejected</div><div class="display-6 text-secondary"><?= $rejected ?></div></div></div></div>
</div>

<ul class="nav nav-tabs mb-3">
    <li class="nav-item"><a class="nav-link <?= $viewMode === 'queue' ? 'active' : '' ?>" href="<?= e(url('admin/verification.php?view=queue')) ?>">Queue <span class="badge text-bg-warning"><?= $pending ?></span></a></li>
    <li class="nav-item"><a class="nav-link <?= $viewMode === 'history' ? 'active' : '' ?>" href="<?= e(url('admin/verification.php?view=history')) ?>">History</a></li>
</ul>

<form class="card card-body mb-4" method="get" action="<?= e(url('admin/verification.php')) ?>">
    <input type="hidden" name="view" value="<?= e($viewMode) ?>">
    <div class="row g-3 align-items-end">
        <div class="col-md-4">
            <label class="form-label" for="verification-q">Search</label>
            <input class="form-control" id="verification-q" name="q" value="<?= e($search) ?>" placeholder="Report code, guardian, barangay">
        </div>
        <?php if ($viewMode === 'history'): ?>
            <div class="col-md-2">
                <label class="form-label" for="verification-status">Status</label>
                <select class="form-select" id="verification-status" name="status">
                    <option value="">All reviewed</option>
                    <option value="verified" <?= $statusFilter === 'verified' ? 'selected' : '' ?>>Verified</option>
                    <option value="rejected" <?= $statusFilter === 'rejected' ? 'selected' : '' ?>>Rejected</option>
                </select>
            </div>
        <?php endif; ?>
        <div class="col-md-2">
            <label class="form-label" for="verification-from">From</label>
            <input class="form-control" type="date" id="verification-from" name="date_from" value="<?= e($dateFrom) ?>">
        </div>
        <div class="col-md-2">
            <label class="form-label" for="verification-to">To</label>
            <input class="form-control" type="date" id="verification-to" name="date_to" value="<?= e($dateTo) ?>">
        </div>
        <div class="col-md-2 d-flex gap-2">
            <button class="btn btn-success" type="submit">Filter</button>
            <a class="btn btn-outline-secondary" href="<?= e(url('admin/verification.php?view=' . $viewMode)) ?>">Reset</a>
        </div>
    </div>
</form>

<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><?= number_format($total) ?> report<?= $total === 1 ? '' : 's' ?></span>
        <?php if ($viewMode === 'queue'): ?><span class="small text-muted">Oldest and attention-flagged reports appear first.</span><?php endif; ?>
    </div>
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Report</th><th>Guardian / location</th><th>System assessment</th><th>Submitted</th><th>Status</th><th class="text-end">Action</th></tr></thead>
            <tbody>
            <?php foreach ($reports as $report): ?>
                <tr>
                    <td>
                        <strong><?= e($report['report_code']) ?></strong>
                        <?php if ((int) $report['needs_attention'] === 1): ?><span class="badge text-bg-danger ms-1">Needs attention</span><?php endif; ?>
                    </td>
                    <td><?= e($report['guardian_name']) ?><div class="small text-muted"><?= e($report['barangay_name']) ?></div></td>
                    <td>
                        <span class="badge <?= e(health_class((string) ($report['final_health'] ?: $report['suggested_health']))) ?>"><?= e($report['final_health'] ?: $report['suggested_health']) ?></span>
                        <div class="small text-muted"><?= e(
                            $report['status'] === 'verified'
                                ? ($report['final_species'] ?: 'Manual identification remains unresolved')
                                : ($report['status'] === 'pending'
                                    ? ($report['suggested_species'] ?: 'Manual identification needed')
                                    : 'No verified identification')
                        ) ?></div>
                    </td>
                    <td><?= e(format_datetime($report['submitted_at'])) ?></td>
                    <td>
                        <span class="badge <?= e(report_status_class($report['status'])) ?>"><?= e(ucfirst($report['status'])) ?></span>
                        <?php if ($report['expert_name']): ?><div class="small text-muted">by <?= e($report['expert_name']) ?></div><?php endif; ?>
                    </td>
                    <td class="text-end"><a class="btn btn-sm btn-success" href="<?= e(url('admin/report.php?id=' . $report['id'])) ?>"><?= $report['status'] === 'pending' ? 'Review' : 'View' ?></a></td>
                </tr>
            <?php endforeach; ?>
            <?php if ($reports === []): ?>
                <tr><td colspan="6" class="text-center py-5 text-muted">No reports match these filters.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php if ($totalPages > 1): ?>
<nav class="mt-4" aria-label="Verification pages"><ul class="pagination justify-content-center">
    <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>"><a class="page-link" href="?<?= e(query_string(['page' => max(1, $page - 1)])) ?>">Previous</a></li>
    <li class="page-item disabled"><span class="page-link">Page <?= $page ?> of <?= $totalPages ?></span></li>
    <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>"><a class="page-link" href="?<?= e(query_string(['page' => min($totalPages, $page + 1)])) ?>">Next</a></li>
</ul></nav>
<?php endif; ?>
