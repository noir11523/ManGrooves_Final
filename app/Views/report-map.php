<?php
$extraHead = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">';
$pageScripts = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script><script src="' . e(asset('js/report-map.js')) . '"></script>';
?>
<a class="small" href="<?= e(url('dashboard.php')) ?>">Back to dashboard</a>
<h1 class="h3 mt-2">Report map</h1>
<p class="text-body-secondary">Tap a pin or report. Pending health results are suggestions.</p>
<form class="row g-2 mb-3" method="get">
<div class="col-md-5"><input class="form-control" name="q" aria-label="Find site or report" placeholder="Find a site or report" value="<?= e($filters['q']) ?>"></div>
<div class="col-md-3"><select class="form-select" name="status" aria-label="Report status"><option value="">All statuses</option><?php foreach (['pending', 'verified', 'rejected'] as $status): ?><option <?= $filters['status'] === $status ? 'selected' : '' ?> value="<?= e($status) ?>"><?= e(ucfirst($status)) ?></option><?php endforeach; ?></select></div>
<div class="col-md-3"><select class="form-select" name="health" aria-label="Health"><option value="">All health</option><?php foreach (['Healthy', 'Stressed', 'At Risk', 'Unknown'] as $health): ?><option <?= $filters['health'] === $health ? 'selected' : '' ?>><?= e($health) ?></option><?php endforeach; ?></select></div><div class="col-md-1"><button class="btn btn-success">Filter</button></div>
</form>
<p><?= (int) $results['total'] ?> reports · Page <?= (int) $results['page'] ?> of <?= (int) $results['pages'] ?></p>
<div class="rounded border mb-3" style="height:420px" data-submitted-map aria-label="Submitted report locations"></div>
<div class="d-flex gap-2 mb-3"><?php foreach (['Healthy', 'Stressed', 'At Risk', 'Unknown'] as $health): ?><span class="badge <?= e(health_class($health)) ?>"><?= e($health) ?></span><?php endforeach; ?></div>
<div class="row g-3">
<?php foreach ($results['items'] as $item): ?><div class="col-md-6"><a class="card card-body text-decoration-none" href="<?= e(url('report-detail.php?id=' . $item['id'])) ?>" data-report-point data-lat="<?= e($item['latitude']) ?>" data-lng="<?= e($item['longitude']) ?>" data-health="<?= e($item['display_health']) ?>" data-code="<?= e($item['report_code']) ?>" data-status="<?= e($item['status']) ?>"><strong><?= e($item['report_code']) ?></strong><span><?= e($item['cluster_name'] ?: $item['sitio_name']) ?></span><span><?= e(ucfirst($item['status'])) ?> · <?= e($item['display_health']) ?></span></a></div><?php endforeach; ?>
<?php if (!$results['items']): ?><p>No reports match these filters.</p><?php endif; ?>
</div>
<nav class="d-flex justify-content-center gap-3 my-4" aria-label="Map pages"><?php if ($results['page'] > 1): ?><a href="?<?= e(query_string(['page' => $results['page'] - 1])) ?>">Previous</a><?php endif; ?><?php if ($results['page'] < $results['pages']): ?><a href="?<?= e(query_string(['page' => $results['page'] + 1])) ?>">Next</a><?php endif; ?></nav>
