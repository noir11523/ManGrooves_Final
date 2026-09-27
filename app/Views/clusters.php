<a class="small" href="<?= e(url('dashboard.php')) ?>">Back to dashboard</a>
<h1 class="h3 mt-2"><?= $timelineView === 'growth' ? 'Growth timelines' : 'Health history' ?></h1>
<p class="text-body-secondary">Choose a cluster to see changes over time.</p>
<form class="d-flex gap-2 mb-3" method="get"><input type="hidden" name="view" value="<?= e($timelineView) ?>"><input class="form-control" aria-label="Find cluster" name="q" placeholder="Find a cluster" value="<?= e(scalar_string($_GET['q'] ?? null)) ?>"><button class="btn btn-success">Search</button></form>
<div class="row g-3">
<?php foreach ($clusters as $item): ?>
<div class="col-md-6"><a class="card card-body h-100 text-decoration-none" href="<?= e(url('cluster.php?id=' . $item['id'] . '#' . ($timelineView === 'growth' ? 'growth-timeline' : 'health-history'))) ?>"><div class="d-flex justify-content-between"><strong><?= e($item['name']) ?></strong><span class="badge <?= e(health_class($item['latest_health'])) ?>"><?= e($item['latest_health']) ?></span></div><span class="small text-body-secondary mt-2"><?= e($item['barangay_name']) ?> · <?= (int) $item['verified_count'] ?> verified reports</span></a></div>
<?php endforeach; ?>
<?php if (!$clusters): ?><p>No clusters found.</p><?php endif; ?>
</div>
