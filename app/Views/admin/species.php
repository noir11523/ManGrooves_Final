<?php
$field = static function (string $key, mixed $default = '') use ($editing): mixed {
    return old($key, $editing[$key] ?? $default);
};
$isActive = (int) old('active', $editing['active'] ?? 1) === 1;
?>
<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h1 class="h3 mb-1">Species management</h1><p class="text-muted mb-0">Maintain the identification traits used by guardian submissions and expert corrections.</p></div><?php if ($editing): ?><a class="btn btn-outline-secondary" href="<?= e(url('admin/species.php')) ?>">Add another species</a><?php endif; ?></div>

<div class="row g-4">
    <div class="col-xl-5">
        <form class="card" method="post" action="<?= e(url('admin/species.php')) ?>">
            <div class="card-header"><h2 class="h5 mb-0"><?= $editing ? 'Edit species' : 'Add species' ?></h2></div>
            <div class="card-body">
                <?= Csrf::field() ?><input type="hidden" name="action" value="save"><?php if ($editing): ?><input type="hidden" name="id" value="<?= (int) $editing['id'] ?>"><?php endif; ?>
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label" for="species-scientific">Scientific name *</label><input class="form-control" id="species-scientific" name="scientific_name" maxlength="190" required value="<?= e($field('scientific_name')) ?>"></div>
                    <div class="col-md-6"><label class="form-label" for="species-common">Common name *</label><input class="form-control" id="species-common" name="common_name" maxlength="190" required value="<?= e($field('common_name')) ?>"></div>
                    <div class="col-md-6"><label class="form-label" for="species-local">Local name(s)</label><input class="form-control" id="species-local" name="local_name" maxlength="255" value="<?= e($field('local_name')) ?>"></div>
                    <div class="col-md-6"><label class="form-label" for="species-family">Family</label><input class="form-control" id="species-family" name="family" maxlength="120" value="<?= e($field('family')) ?>"></div>
                    <div class="col-md-4"><label class="form-label" for="species-iucn">IUCN code</label><input class="form-control" id="species-iucn" name="iucn_code" maxlength="10" value="<?= e($field('iucn_code')) ?>"></div>
                    <div class="col-md-8"><label class="form-label" for="species-iucn-label">IUCN label</label><input class="form-control" id="species-iucn-label" name="iucn_label" maxlength="60" value="<?= e($field('iucn_label')) ?>"></div>
                    <div class="col-12"><label class="form-label" for="species-trend">Population trend</label><select class="form-select" id="species-trend" name="population_trend"><?php foreach ($trends as $trend): ?><option value="<?= e($trend) ?>" <?= $field('population_trend', 'Unknown') === $trend ? 'selected' : '' ?>><?= e($trend) ?></option><?php endforeach; ?></select></div>
                    <div class="col-12"><label class="form-label" for="species-root">Root type *</label><input class="form-control" id="species-root" name="root_type" maxlength="190" required value="<?= e($field('root_type')) ?>"></div>
                    <div class="col-12"><label class="form-label" for="species-root-image">Root guide image path</label><input class="form-control" id="species-root-image" name="root_type_image" maxlength="255" value="<?= e($field('root_type_image')) ?>" placeholder="img/guides/example.png"></div>
                    <div class="col-12"><label class="form-label" for="species-leaf">Leaf shape *</label><input class="form-control" id="species-leaf" name="leaf_shape" maxlength="190" required value="<?= e($field('leaf_shape')) ?>"></div>
                    <div class="col-12"><label class="form-label" for="species-leaf-image">Leaf guide image path</label><input class="form-control" id="species-leaf-image" name="leaf_shape_image" maxlength="255" value="<?= e($field('leaf_shape_image')) ?>"></div>
                    <div class="col-12"><label class="form-label" for="species-bark">Bark texture *</label><input class="form-control" id="species-bark" name="bark_texture" maxlength="255" required value="<?= e($field('bark_texture')) ?>"></div>
                    <div class="col-12"><label class="form-label" for="species-bark-image">Bark guide image path</label><input class="form-control" id="species-bark-image" name="bark_texture_image" maxlength="255" value="<?= e($field('bark_texture_image')) ?>"></div>
                    <div class="col-12"><label class="form-label" for="species-provenance">Provenance / source</label><input class="form-control" id="species-provenance" name="provenance" maxlength="255" value="<?= e($field('provenance')) ?>"></div>
                    <div class="col-12"><input type="hidden" name="active" value="0"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="species-active" name="active" value="1" <?= $isActive ? 'checked' : '' ?>><label class="form-check-label" for="species-active">Available for identification and correction</label></div></div>
                </div>
            </div>
            <div class="card-footer"><button class="btn btn-success" type="submit"><?= $editing ? 'Save changes' : 'Create species' ?></button></div>
        </form>
    </div>
    <div class="col-xl-7">
        <form class="card card-body mb-3" method="get"><div class="row g-2"><div class="col-md-7"><input class="form-control" name="q" value="<?= e($search) ?>" placeholder="Search scientific, common, or local name"></div><div class="col-md-3"><select class="form-select" name="active"><option value="">All statuses</option><option value="1" <?= $activeFilter === '1' ? 'selected' : '' ?>>Active</option><option value="0" <?= $activeFilter === '0' ? 'selected' : '' ?>>Inactive</option></select></div><div class="col-md-2"><button class="btn btn-outline-success w-100" type="submit">Filter</button></div></div></form>
        <div class="card"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Species</th><th>Identification traits</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody>
        <?php foreach ($speciesRows as $item): ?><tr><td><strong><?= e($item['common_name']) ?></strong><div class="fst-italic"><?= e($item['scientific_name']) ?></div><div class="small text-muted"><?= e($item['local_name'] ?: 'No local name') ?><?= $item['iucn_code'] ? ' · ' . e($item['iucn_code']) : '' ?></div></td><td><div class="small"><strong>Roots:</strong> <?= e($item['root_type']) ?></div><div class="small"><strong>Leaf:</strong> <?= e($item['leaf_shape']) ?></div><div class="small"><strong>Bark:</strong> <?= e($item['bark_texture']) ?></div></td><td><span class="badge <?= (int) $item['active'] === 1 ? 'text-bg-success' : 'text-bg-secondary' ?>"><?= (int) $item['active'] === 1 ? 'Active' : 'Inactive' ?></span></td><td class="text-end"><a class="btn btn-sm btn-outline-success" href="<?= e(url('admin/species.php?edit=' . $item['id'])) ?>">Edit</a> <form class="d-inline js-confirm-form" data-confirm="Delete this unused species?" method="post" action="<?= e(url('admin/species.php')) ?>"><?= Csrf::field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int) $item['id'] ?>"><button class="btn btn-sm btn-outline-danger" type="submit">Delete</button></form></td></tr><?php endforeach; ?>
        <?php if ($speciesRows === []): ?><tr><td colspan="4" class="text-center text-muted py-5">No species match this filter.</td></tr><?php endif; ?>
        </tbody></table></div></div>
    </div>
</div>
<script src="<?= e(asset('js/admin.js')) ?>" defer></script>
