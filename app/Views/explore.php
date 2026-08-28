<?php

declare(strict_types=1);

$extraHead = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">';
$pageScripts = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>'
    . '<script src="' . e(asset('js/maps.js')) . '"></script>';
?>
<section class="mb-4"><h1 class="h2 mb-1">Explore mangrove species</h1><p class="text-body-secondary mb-0">Search the species catalog, then select a result to see where it has been verified.</p></section>

<div data-explore-map data-clusters-url="<?= e(url('api/clusters.php')) ?>" data-species-url="<?= e(url('api/species-clusters.php')) ?>">
    <form class="card border-0 shadow-sm mb-4" method="get" role="search" data-species-search-form>
        <div class="card-body d-flex flex-column flex-sm-row gap-2"><label class="visually-hidden" for="species_search">Search species</label><input class="form-control form-control-lg" type="search" id="species_search" name="q" value="<?= e($query) ?>" placeholder="Scientific, common, local, or family name" data-species-search><button class="btn btn-success px-4" type="submit"><i class="bi bi-search me-1" aria-hidden="true"></i>Search</button></div>
    </form>
    <div class="row g-4">
        <div class="col-xl-7"><div class="card border-0 shadow-sm"><div class="card-body p-0"><div class="rounded" style="min-height:540px" data-cluster-map aria-label="Mangrove species and cluster map"></div></div></div></div>
        <div class="col-xl-5"><div class="d-flex justify-content-between align-items-center mb-2"><h2 class="h5 mb-0">Species catalog</h2><span class="small text-body-secondary" data-species-count><?= count($species) ?> result<?= count($species) === 1 ? '' : 's' ?></span></div><div class="vstack gap-3" data-species-results>
            <?php foreach ($species as $item): ?>
                <article class="card border-0 shadow-sm" data-species-card data-species-id="<?= (int) $item['id'] ?>"><div class="card-body"><div class="d-flex justify-content-between gap-2"><div><h3 class="h6 mb-1"><em><?= e($item['scientific_name']) ?></em></h3><p class="mb-1"><?= e($item['common_name']) ?></p></div><span class="badge <?= $item['iucn_code'] === 'VU' ? 'text-bg-warning' : 'text-bg-success' ?> align-self-start"><?= e($item['iucn_code'] ?: 'N/A') ?></span></div><p class="small text-body-secondary mb-2"><?= e($item['local_name'] ?: 'No recorded local name') ?> · <?= e($item['family'] ?: 'Family unlisted') ?></p><p class="small mb-2"><strong><?= (int) $item['cluster_count'] ?></strong> monitored cluster<?= (int) $item['cluster_count'] === 1 ? '' : 's' ?><?= $item['cluster_names'] ? ': ' . e($item['cluster_names']) : '' ?></p><button class="btn btn-sm btn-outline-success" type="button" data-show-species="<?= (int) $item['id'] ?>">Show on map</button></div></article>
            <?php endforeach; ?>
            <?php if (!$species): ?><div class="text-center text-body-secondary py-5" data-empty-species>No species matched your search.</div><?php endif; ?>
        </div></div>
    </div>
</div>
