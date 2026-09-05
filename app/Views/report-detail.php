<?php declare(strict_types=1); ?>
<?php if (!$report): ?>
    <section class="text-center py-5"><i class="bi bi-file-earmark-x display-3 text-body-secondary" aria-hidden="true"></i><h1 class="h3 mt-3">Report not found</h1><p class="text-body-secondary">It may not exist, or you may not have permission to view it.</p><a class="btn btn-success" href="<?= e(url('reports.php')) ?>">Back to reports</a></section>
<?php else: ?>
    <?php
        $contextScore = 0;
        foreach ($report['observations'] as $observationGroup) {
            if ($observationGroup['score_group'] !== 'context') {
                continue;
            }
            foreach ($observationGroup['options'] as $observedOption) {
                $contextScore += (int) $observedOption['points'];
            }
        }
    ?>
    <?php if (empty($embedded)): ?>
        <div class="mb-3"><a class="small text-decoration-none" href="<?= e(url('reports.php')) ?>"><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Reports</a></div>
    <?php endif; ?>
    <article data-report-detail>
        <header class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <div><p class="text-uppercase text-body-secondary small fw-semibold mb-1">Report</p><h<?= empty($embedded) ? '1' : '3' ?> class="h3 mb-1"><?= e($report['report_code']) ?></h<?= empty($embedded) ? '1' : '3' ?>><p class="text-body-secondary mb-0">Submitted <?= e(format_datetime((string) $report['submitted_at'])) ?> by <?= e($report['guardian_name']) ?></p></div>
            <div class="d-flex gap-2"><span class="badge <?= e(report_status_class((string) $report['status'])) ?> fs-6"><?= e(ucfirst((string) $report['status'])) ?></span><span class="badge <?= e(health_class((string) ($report['final_health'] ?: $report['suggested_health']))) ?> fs-6"><?= e($report['final_health'] ?: $report['suggested_health']) ?></span></div>
        </header>

        <div class="row g-4">
            <div class="col-lg-5">
                <img class="img-fluid rounded shadow-sm w-100" src="<?= e(report_photo_url((int) $report['id'])) ?>" alt="Mangrove evidence for report <?= e($report['report_code']) ?>">
                <dl class="row small mt-3 mb-0">
                    <dt class="col-5">Cluster</dt><dd class="col-7"><?= e($report['cluster_name'] ?: 'Awaiting assignment') ?></dd>
                    <dt class="col-5">Barangay</dt><dd class="col-7"><?= e($report['barangay_name']) ?></dd>
                    <dt class="col-5">Sitio</dt><dd class="col-7"><?= e($report['sitio_name'] ?: '—') ?></dd>
                    <dt class="col-5">Coordinates</dt><dd class="col-7"><a href="https://www.openstreetmap.org/?mlat=<?= e($report['latitude']) ?>&amp;mlon=<?= e($report['longitude']) ?>#map=18/<?= e($report['latitude']) ?>/<?= e($report['longitude']) ?>" target="_blank" rel="noopener noreferrer"><?= e($report['latitude']) ?>, <?= e($report['longitude']) ?></a></dd>
                    <dt class="col-5">GPS accuracy</dt><dd class="col-7"><?= $report['location_accuracy'] !== null ? e($report['location_accuracy']) . ' m' : 'Manual pin' ?></dd>
                    <?php if ($report['parent_report_code']): ?><dt class="col-5">Follow-up to</dt><dd class="col-7"><?= e($report['parent_report_code']) ?></dd><?php endif; ?>
                </dl>
            </div>
            <div class="col-lg-7">
                <section class="card mb-3"><div class="card-body"><h4 class="h5">Classification</h4>
                    <dl class="row mb-0">
                        <dt class="col-sm-5">Canonical health score</dt><dd class="col-sm-7"><?= (int) $report['health_score'] ?>/<?= (int) $report['health_max_score'] ?> — <?= e($report['suggested_health']) ?></dd>
                        <dt class="col-sm-5">Final health</dt><dd class="col-sm-7"><?= e($report['final_health'] ?: 'Awaiting expert verification') ?></dd>
                        <dt class="col-sm-5">Suggested species</dt><dd class="col-sm-7"><em><?= e($report['suggested_species_name'] ?: 'Needs manual identification') ?></em><?= $report['species_confidence'] !== null ? ' (' . e($report['species_confidence']) . '%)' : '' ?></dd>
                        <dt class="col-sm-5">Final species</dt><dd class="col-sm-7"><em><?= e($report['final_species_name'] ?: 'Awaiting expert verification') ?></em></dd>
                        <dt class="col-sm-5">Context score</dt><dd class="col-sm-7"><?= $contextScore ?> <span class="text-body-secondary">(separate from health)</span></dd>
                        <dt class="col-sm-5">Environmental score</dt><dd class="col-sm-7"><?= (int) $report['environmental_score'] ?> <span class="text-body-secondary">(separate from health)</span></dd>
                        <dt class="col-sm-5">Observed alive</dt><dd class="col-sm-7"><?= $report['observed_alive_count'] !== null ? number_format((int) $report['observed_alive_count']) : 'Not counted' ?></dd>
                    </dl>
                </div></section>
                <section class="card mb-3"><div class="card-body"><h4 class="h5">Observed traits</h4><dl class="row mb-0"><dt class="col-sm-4">Roots</dt><dd class="col-sm-8"><?= e($report['root_type']) ?></dd><dt class="col-sm-4">Leaves</dt><dd class="col-sm-8"><?= e($report['leaf_shape']) ?></dd><dt class="col-sm-4">Bark</dt><dd class="col-sm-8"><?= e($report['bark_texture']) ?></dd></dl></div></section>
                <?php if ($report['guardian_remarks']): ?><section class="card mb-3"><div class="card-body"><h4 class="h5">Guardian remarks</h4><p class="mb-0 text-break"><?= nl2br(e($report['guardian_remarks'])) ?></p></div></section><?php endif; ?>
                <?php if ($report['expert_feedback']): ?><section class="alert <?= $report['status'] === 'rejected' ? 'alert-danger' : 'alert-success' ?>"><h4 class="h6">Expert feedback<?= $report['expert_name'] ? ' from ' . e($report['expert_name']) : '' ?></h4><p class="mb-0 text-break"><?= nl2br(e($report['expert_feedback'])) ?></p></section><?php endif; ?>
            </div>
        </div>

        <section class="mt-4" aria-labelledby="checklist-title"><h4 class="h5" id="checklist-title">Complete checklist</h4><div class="row g-3">
            <?php foreach ($report['observations'] as $observation): ?>
                <div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body"><div class="d-flex justify-content-between gap-2"><strong><?= e($observation['name']) ?></strong><span class="badge text-bg-light border"><?= e(ucfirst((string) $observation['score_group'])) ?></span></div><?php if ($observation['options']): ?><ul class="mb-0 mt-2"><?php foreach ($observation['options'] as $option): ?><li><?= e($option['label']) ?></li><?php endforeach; ?></ul><?php else: ?><p class="small text-body-secondary mb-0 mt-2">None selected</p><?php endif; ?></div></div></div>
            <?php endforeach; ?>
        </div></section>

        <?php if ($report['verification_history']): ?><section class="mt-4"><h4 class="h5">Verification history</h4><ol class="list-group list-group-numbered"><?php foreach ($report['verification_history'] as $log): ?><li class="list-group-item"><div class="d-flex flex-wrap justify-content-between"><strong><?= e(ucfirst((string) $log['action'])) ?> by <?= e($log['verifier_name']) ?></strong><time class="small text-body-secondary" datetime="<?= e($log['created_at']) ?>"><?= e(format_datetime((string) $log['created_at'])) ?></time></div><?php if ($log['comment']): ?><p class="mb-0 mt-1 text-break"><?= nl2br(e($log['comment'])) ?></p><?php endif; ?></li><?php endforeach; ?></ol></section><?php endif; ?>

        <?php if ($report['status'] === 'verified' && !empty($report['cluster_id']) && ($user['role'] ?? '') === 'guardian'): ?><div class="mt-4"><a class="btn btn-success" href="<?= e(url('submit-report.php?parent=' . $report['id'])) ?>"><i class="bi bi-arrow-repeat me-2" aria-hidden="true"></i>Submit follow-up</a></div><?php endif; ?>
    </article>
<?php endif; ?>
