<?php
// Shared chronological, verified-only history. Counts are observations, not tree height.
$historyEntries = $healthGrowthEntries ?? [];
$counted = array_values(array_filter($historyEntries, static fn(array $item): bool => $item['observed_alive_count'] !== null));
$maxAlive = max([1, ...array_map(static fn(array $item): int => (int) $item['observed_alive_count'], $counted)]);
?>
<nav class="d-flex flex-wrap gap-2 mb-4" aria-label="Cluster history"><a class="btn btn-outline-success" href="#health-history">Health history</a><a class="btn btn-outline-success" href="#growth-timeline">Growth timeline</a><a class="btn btn-outline-success" href="#observation-timeline">Report details</a></nav>
<section class="card card-body mb-4" id="health-history">
<h2 class="h5">Health history</h2><p class="small text-body-secondary">Verified visits, oldest to newest.</p>
<div class="health-history-strip">
<?php foreach ($historyEntries as $entry): ?>
    <div class="health-history-point"><time class="small"><?= e(format_datetime($entry['submitted_at'], 'M j, Y')) ?></time><span class="badge <?= e(health_class($entry['health'])) ?>"><?= e($entry['health']) ?></span><span class="small"><?= !empty($entry['parent_report_id']) ? 'Follow-up' : 'Visit' ?></span></div>
<?php endforeach; ?>
<?php if (!$historyEntries): ?><p>No verified visits yet.</p><?php endif; ?>
</div></section>
<section class="card card-body mb-4" id="growth-timeline">
<h2 class="h5">Growth timeline</h2><p class="small text-body-secondary">Living mangroves counted at each verified visit. Changes can reflect a different area counted.</p>
<?php $previousAlive = null; foreach ($counted as $entry): $alive = (int) $entry['observed_alive_count']; $change = $previousAlive === null ? null : $alive - $previousAlive; ?>
<div class="growth-row"><time class="small"><?= e(format_datetime($entry['submitted_at'], 'M j, Y')) ?></time><div class="progress" role="img" aria-label="<?= $alive ?> living mangroves"><div class="progress-bar bg-success" style="width:<?= round($alive / $maxAlive * 100) ?>%"></div></div><strong><?= number_format($alive) ?></strong><span class="small text-body-secondary"><?= $change === null ? 'First count' : ($change > 0 ? '+' : '') . $change . ' since last visit' ?></span></div>
<?php $previousAlive = $alive; endforeach; ?>
<?php if (!$counted): ?><p>No verified counts yet.</p><?php endif; ?>
</section>
