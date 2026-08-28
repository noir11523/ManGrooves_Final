<?php
$photoUrl = report_photo_url((int) $report['id']);
$displayHealth = $report['final_health'] ?: $report['suggested_health'];
$displaySpecies = $report['final_common_name'] ?: ($report['suggested_common_name'] ?: 'Manual identification needed');
$oldAction = (string) old('action', 'confirm');
$oldAction = in_array($oldAction, ['confirm', 'correct', 'reject'], true) ? $oldAction : 'confirm';
?>
<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div>
        <a class="small text-decoration-none" href="<?= e(url('admin/verification.php?view=' . ($report['status'] === 'pending' ? 'queue' : 'history'))) ?>">&larr; Back to verification</a>
        <h1 class="h3 mb-1 mt-2"><?= e($report['report_code']) ?></h1>
        <div class="d-flex flex-wrap gap-2 align-items-center">
            <span class="badge <?= e(report_status_class($report['status'])) ?>"><?= e(ucfirst($report['status'])) ?></span>
            <?php if ((int) $report['needs_attention'] === 1): ?><span class="badge text-bg-danger">Needs attention</span><?php endif; ?>
            <span class="text-muted small">Submitted <?= e(format_datetime($report['submitted_at'])) ?></span>
        </div>
    </div>
    <?php if ($report['cluster_id']): ?><a class="btn btn-outline-success" href="<?= e(url('admin/cluster.php?id=' . $report['cluster_id'])) ?>">Open cluster timeline</a><?php endif; ?>
</div>

<div class="row g-4">
    <div class="col-xl-7">
        <div class="card mb-4 overflow-hidden">
            <img src="<?= e($photoUrl) ?>" class="card-img-top" alt="Field evidence for <?= e($report['report_code']) ?>" style="max-height:560px;object-fit:contain;background:#eef3ee">
            <div class="card-body">
                <h2 class="h5">Field evidence</h2>
                <dl class="row mb-0">
                    <dt class="col-sm-4">Guardian</dt><dd class="col-sm-8"><?= e($report['guardian_name']) ?> <span class="text-muted">(<?= e($report['guardian_email']) ?>)</span></dd>
                    <dt class="col-sm-4">Location</dt><dd class="col-sm-8"><?= e($report['sitio_name'] ?: 'Sitio not supplied') ?>, <?= e($report['barangay_name']) ?></dd>
                    <dt class="col-sm-4">Coordinates</dt><dd class="col-sm-8"><?= e($report['latitude']) ?>, <?= e($report['longitude']) ?><?= $report['location_accuracy'] !== null ? ' (±' . e($report['location_accuracy']) . ' m)' : '' ?></dd>
                    <dt class="col-sm-4">Observed alive</dt><dd class="col-sm-8"><?= $report['observed_alive_count'] === null ? 'Not recorded' : number_format((int) $report['observed_alive_count']) ?></dd>
                    <dt class="col-sm-4">Guardian remarks</dt><dd class="col-sm-8"><?= nl2br(e($report['guardian_remarks'] ?: 'No remarks.')) ?></dd>
                </dl>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header"><h2 class="h5 mb-0">Location map</h2></div>
            <div id="report-map" style="height:340px" data-lat="<?= e($report['latitude']) ?>" data-lng="<?= e($report['longitude']) ?>" data-label="<?= e($report['report_code']) ?>"></div>
        </div>

        <div class="card mb-4">
            <div class="card-header"><h2 class="h5 mb-0">Checklist observations</h2></div>
            <div class="table-responsive"><table class="table mb-0 align-middle">
                <thead><tr><th>Criterion</th><th>Observation</th><th>Group</th><th class="text-end">Points</th></tr></thead>
                <tbody>
                <?php foreach ($observations as $observation): ?>
                    <tr><td><?= e($observation['criterion_name']) ?></td><td><?= e($observation['option_label']) ?></td><td><?= e(ucfirst($observation['score_group'])) ?></td><td class="text-end"><?= (int) $observation['points_snapshot'] ?></td></tr>
                <?php endforeach; ?>
                <?php if ($observations === []): ?><tr><td colspan="4" class="text-center text-muted py-4">No checklist rows were stored.</td></tr><?php endif; ?>
                </tbody>
            </table></div>
        </div>
    </div>

    <div class="col-xl-5">
        <div class="card mb-4">
            <div class="card-header"><h2 class="h5 mb-0">Automated assessment</h2></div>
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-6"><div class="text-muted small">Health</div><span class="badge <?= e(health_class($displayHealth)) ?>"><?= e($displayHealth) ?></span></div>
                    <div class="col-6"><div class="text-muted small">Score</div><strong><?= (int) $report['health_score'] ?> / <?= (int) $report['health_max_score'] ?></strong></div>
                    <div class="col-12"><div class="text-muted small">Species</div><strong><?= e($displaySpecies) ?></strong><?php if ($report['suggested_scientific_name']): ?><div class="small fst-italic"><?= e($report['suggested_scientific_name']) ?></div><?php endif; ?></div>
                    <div class="col-12"><div class="text-muted small">Traits</div><ul class="mb-0"><li>Roots: <?= e($report['root_type']) ?></li><li>Leaf: <?= e($report['leaf_shape']) ?></li><li>Bark: <?= e($report['bark_texture']) ?></li></ul></div>
                </div>
            </div>
        </div>

        <?php if ($report['status'] === 'pending'): ?>
        <form class="card mb-4 js-verification-form" method="post" action="<?= e(url('admin/report.php')) ?>">
            <div class="card-header"><h2 class="h5 mb-0">Expert decision</h2></div>
            <div class="card-body">
                <?= Csrf::field() ?>
                <input type="hidden" name="report_id" value="<?= (int) $report['id'] ?>">
                <fieldset class="mb-3">
                    <legend class="form-label">Decision</legend>
                    <div class="form-check"><input class="form-check-input" type="radio" name="action" id="decision-confirm" value="confirm" <?= $oldAction === 'confirm' ? 'checked' : '' ?>><label class="form-check-label" for="decision-confirm"><strong>Confirm</strong> the automated assessment</label></div>
                    <div class="form-check"><input class="form-check-input" type="radio" name="action" id="decision-correct" value="correct" <?= $oldAction === 'correct' ? 'checked' : '' ?>><label class="form-check-label" for="decision-correct"><strong>Correct</strong> health, species, or rarity</label></div>
                    <div class="form-check"><input class="form-check-input" type="radio" name="action" id="decision-reject" value="reject" <?= $oldAction === 'reject' ? 'checked' : '' ?>><label class="form-check-label" for="decision-reject"><strong>Reject</strong> unusable or insufficient evidence</label></div>
                </fieldset>

                <div class="js-correction-fields border rounded p-3 mb-3" hidden>
                    <div class="mb-3">
                        <label class="form-label" for="final-health">Final health</label>
                        <select class="form-select" id="final-health" name="final_health">
                            <?php foreach (['Healthy', 'Stressed', 'At Risk'] as $health): ?><option value="<?= e($health) ?>" <?= old('final_health', $displayHealth) === $health ? 'selected' : '' ?>><?= e($health) ?></option><?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="final-species">Final species</label>
                        <select class="form-select" id="final-species" name="final_species_id">
                            <option value="">Manual identification remains unresolved</option>
                            <?php foreach ($species as $item): ?>
                                <option value="<?= (int) $item['id'] ?>" <?= (int) old('final_species_id', $report['final_species_id'] ?: $report['suggested_species_id']) === (int) $item['id'] ? 'selected' : '' ?>><?= e($item['common_name']) ?> — <?= e($item['scientific_name']) ?><?= $item['iucn_code'] ? ' (' . e($item['iucn_code']) . ')' : '' ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" for="rarity-level">Rarity</label>
                        <select class="form-select" id="rarity-level" name="rarity_level">
                            <?php foreach (['Common', 'Vulnerable', 'Rare', 'Unassigned'] as $rarity): ?><option value="<?= e($rarity) ?>" <?= old('rarity_level', $report['rarity_level']) === $rarity ? 'selected' : '' ?>><?= e($rarity) ?></option><?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="form-check form-switch mb-3 js-attention-field">
                    <input class="form-check-input" type="checkbox" id="needs-attention" name="needs_attention" value="1" <?= (int) old('needs_attention', $report['needs_attention']) === 1 ? 'checked' : '' ?>>
                    <label class="form-check-label" for="needs-attention">Flag for conservation attention</label>
                </div>
                <div class="mb-3">
                    <label class="form-label" for="expert-feedback">Coaching feedback <span class="js-rejection-required text-danger" hidden>(required for rejection)</span></label>
                    <textarea class="form-control" id="expert-feedback" name="expert_feedback" maxlength="5000" rows="5" placeholder="Explain what the guardian did well and what to improve."><?= e(old('expert_feedback')) ?></textarea>
                </div>
                <p class="small text-muted">Verified reports are assigned to the nearest cluster within its radius, schedule a 30-day follow-up, and notify the guardian.</p>
                <button class="btn btn-success w-100" type="submit">Save decision</button>
            </div>
        </form>
        <?php else: ?>
        <div class="card mb-4">
            <div class="card-header"><h2 class="h5 mb-0">Expert decision</h2></div>
            <div class="card-body">
                <dl class="row mb-0"><dt class="col-5">Reviewed by</dt><dd class="col-7"><?= e($report['expert_name'] ?: 'Unknown') ?></dd><dt class="col-5">Reviewed at</dt><dd class="col-7"><?= e(format_datetime($report['verified_at'])) ?></dd><dt class="col-5">Feedback</dt><dd class="col-7"><?= nl2br(e($report['expert_feedback'] ?: 'No feedback.')) ?></dd><?php if ($report['cluster_name']): ?><dt class="col-5">Cluster</dt><dd class="col-7"><?= e($report['cluster_code']) ?> — <?= e($report['cluster_name']) ?></dd><?php endif; ?></dl>
            </div>
        </div>
        <?php endif; ?>

        <?php if ($logs !== []): ?>
        <div class="card"><div class="card-header"><h2 class="h5 mb-0">Verification log</h2></div><div class="list-group list-group-flush">
            <?php foreach ($logs as $log): ?><div class="list-group-item"><div class="d-flex justify-content-between gap-2"><strong><?= e(ucfirst($log['action'])) ?> by <?= e($log['verifier_name']) ?></strong><span class="small text-muted"><?= e(format_datetime($log['created_at'])) ?></span></div><div class="small"><?= e($log['previous_status']) ?> &rarr; <?= e($log['new_status']) ?>; <?= e($log['previous_health'] ?: '—') ?> &rarr; <?= e($log['new_health'] ?: '—') ?></div><?php if ($log['comment']): ?><div class="mt-2"><?= nl2br(e($log['comment'])) ?></div><?php endif; ?></div><?php endforeach; ?>
        </div></div>
        <?php endif; ?>
    </div>
</div>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous" defer></script>
<script src="<?= e(asset('js/admin.js')) ?>" defer></script>
