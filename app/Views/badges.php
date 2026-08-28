<?php
declare(strict_types=1);
$hasEarnedBadge = count(array_filter($badges, static fn (array $badge): bool => (bool) $badge['earned'])) > 0;
?>
<section class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4"><div><h1 class="h2 mb-1">My guardian badges</h1><p class="text-body-secondary mb-0">Badges unlock only from verified community contributions.</p></div><?php if ($hasEarnedBadge): ?><a class="btn btn-outline-success" href="<?= e(url('certificate.php')) ?>"><i class="bi bi-printer me-2" aria-hidden="true"></i>Print certificate</a><?php else: ?><span class="small text-body-secondary"><i class="bi bi-lock-fill me-1" aria-hidden="true"></i>Certificate unlocks with your first badge</span><?php endif; ?></section>

<section class="row g-3 mb-4" aria-label="Badge metrics">
    <?php foreach (['verified_reports' => 'Verified reports', 'verified_followups' => 'Verified follow-ups', 'distinct_species' => 'Distinct species', 'uncorrected_reports' => 'Uncorrected reports'] as $metric => $label): ?>
        <div class="col-6 col-xl-3"><div class="card border-0 shadow-sm h-100"><div class="card-body"><div class="h3 mb-1"><?= number_format((int) ($metrics[$metric] ?? 0)) ?></div><div class="small text-body-secondary"><?= e($label) ?></div></div></div></div>
    <?php endforeach; ?>
</section>

<section class="row g-4" aria-label="Available badges">
    <?php foreach ($badges as $badge): ?>
        <div class="col-md-6 col-xl-4"><article class="card h-100 border-0 shadow-sm <?= $badge['earned'] ? '' : 'opacity-75' ?>"><div class="card-body text-center p-4">
            <?php if (!empty($badge['image_path'])): ?>
                <div class="position-relative d-inline-block mb-3">
                    <img src="<?= e(asset((string) $badge['image_path'])) ?>" width="96" height="96" alt="<?= e($badge['badge_name']) ?> badge" class="<?= $badge['earned'] ? '' : 'opacity-50' ?>">
                    <?php if (!$badge['earned']): ?><span class="position-absolute top-50 start-50 translate-middle badge rounded-circle text-bg-dark p-2"><i class="bi bi-lock-fill" aria-hidden="true"></i><span class="visually-hidden">Locked</span></span><?php endif; ?>
                </div>
            <?php else: ?>
                <div class="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle <?= $badge['earned'] ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary' ?>" style="width:5rem;height:5rem"><i class="bi <?= $badge['earned'] ? 'bi-award-fill' : 'bi-lock-fill' ?> display-6" aria-hidden="true"></i></div>
            <?php endif; ?>
            <h2 class="h5"><?= e($badge['badge_name']) ?></h2><p class="text-body-secondary small"><?= e($badge['description']) ?></p>
            <div class="progress" role="progressbar" aria-label="Progress toward <?= e($badge['badge_name']) ?>" aria-valuenow="<?= e($badge['progress_percent']) ?>" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar <?= $badge['earned'] ? 'bg-success' : 'bg-secondary' ?>" style="width:<?= e($badge['progress_percent']) ?>%"></div></div>
            <div class="d-flex justify-content-between small mt-2"><span><?= min((int) $badge['current_value'], (int) $badge['target_value']) ?> / <?= (int) $badge['target_value'] ?></span><span><?= $badge['earned'] ? 'Earned ' . e(format_datetime((string) $badge['earned_at'], 'M j, Y')) : e((string) (100 - $badge['progress_percent'])) . '% remaining' ?></span></div>
        </div></article></div>
    <?php endforeach; ?>
</section>
