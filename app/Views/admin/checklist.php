<a class="small" href="<?= e(url('dashboard.php')) ?>">Back to dashboard</a>
<h1 class="h3 mt-2">Health checklist</h1>
<p class="text-body-secondary">Edit questions, points, and guide photos. Saved reports keep their original scores.</p>
<div class="card card-body mb-3">
    <h2 class="h5">Health score: 6 points</h2>
    <p class="mb-1">Leaf color + pests + roots. Each adds 0, 1, or 2 points.</p>
    <p class="mb-1"><strong>6 Healthy · 3–5 Stressed · 0–2 At Risk</strong></p>
    <p class="small mb-0">Not Sure: no score; needs review. None of the above: 0. All of the above: lowest score (0) for health; total of regular choices for environment. Context and environment do not change the health score.</p>
</div>
<?php if ($error): ?><div class="alert alert-danger" role="alert"><?= e($error) ?></div><?php endif; ?>
<?php foreach ($criteria as $criterion): ?>
<details class="card mb-3" id="criterion-<?= (int) $criterion['id'] ?>" <?= is_post() && (int) ($_POST['id'] ?? 0) === $criterion['id'] ? 'open' : '' ?>>
<summary class="card-header p-3"><strong><?= e($criterion['name']) ?></strong> <span class="badge text-bg-light ms-2"><?= $criterion['score_group'] === 'health' ? '0–2 health points' : 'Supporting observations' ?></span></summary>
<form class="card-body" method="post" enctype="multipart/form-data" data-confirm="Save these checklist changes? New reports will use them.">
    <?= Csrf::field() ?>
    <input type="hidden" name="id" value="<?= (int) $criterion['id'] ?>"><input type="hidden" name="version" value="<?= e($criterion['version']) ?>">
    <div class="row g-3 mb-3">
        <div class="col-md-4"><label class="form-label" for="name-<?= $criterion['id'] ?>">Name</label><input class="form-control" id="name-<?= $criterion['id'] ?>" name="name" maxlength="120" value="<?= e($criterion['name']) ?>" required></div>
        <div class="col-md-8"><label class="form-label" for="question-<?= $criterion['id'] ?>">Question</label><input class="form-control" id="question-<?= $criterion['id'] ?>" name="question_text" maxlength="255" value="<?= e($criterion['question_text']) ?>" required></div>
        <div class="col-12"><label class="form-label" for="guide-<?= $criterion['id'] ?>">Guide photo</label><input class="form-control" id="guide-<?= $criterion['id'] ?>" type="file" name="guide_image" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, or WebP. Up to 5 MB.</small></div>
        <?php if ($criterion['guide_image']): ?><div class="col-12"><img class="img-fluid rounded" style="max-height:180px" src="<?= e(asset($criterion['guide_image'])) ?>" alt="Current guide"><label class="form-check mt-2"><input class="form-check-input" type="checkbox" name="remove_guide" value="1"> Remove guide photo</label></div><?php endif; ?>
    </div>
    <div class="row g-3">
    <?php foreach ($criterion['options'] as $index => $option): $reserved = in_array($option['code'], ['unknown', 'none_of_the_above', 'all_of_the_above'], true); ?>
        <div class="col-md-6 col-xl-4"><div class="border rounded p-3 h-100">
            <input type="hidden" name="options[<?= $index ?>][id]" value="<?= $option['id'] ?>">
            <label class="form-label" for="choice-<?= $option['id'] ?>">Choice</label><input class="form-control mb-2" id="choice-<?= $option['id'] ?>" name="options[<?= $index ?>][label]" value="<?= e($option['label']) ?>" maxlength="190" required <?= $reserved ? 'readonly' : '' ?>>
            <?php if ($reserved): ?>
                <input type="hidden" name="options[<?= $index ?>][points]" value="0">
                <p class="mb-2"><strong>Scoring:</strong> <?= $option['code'] === 'unknown' ? 'Not scored' : ($option['code'] === 'all_of_the_above' && $criterion['score_group'] !== 'health' ? 'Total of regular choices' : '0 points') ?></p>
            <?php else: ?>
                <label class="form-label" for="points-<?= $option['id'] ?>">Points</label><input class="form-control mb-2" id="points-<?= $option['id'] ?>" type="number" name="options[<?= $index ?>][points]" min="<?= $criterion['score_group'] === 'health' ? 0 : -2 ?>" max="2" step="1" value="<?= $option['points'] ?>" required>
            <?php endif; ?>
            <?php if ($reserved): ?><p class="small text-body-secondary"><?= $option['code'] === 'unknown' ? 'Unscored. Sends the report for review.' : ($option['code'] === 'all_of_the_above' ? ($criterion['score_group'] === 'health' ? 'Mixed conditions: uses the lowest score (0).' : 'Adds the regular choices automatically.') : 'No matching signs. Adds 0 points.') ?></p><?php endif; ?>
            <?php if ($option['image_path']): ?><img class="img-fluid rounded mb-2" style="max-height:120px" src="<?= e(asset($option['image_path'])) ?>" alt="<?= e($option['label']) ?>"><label class="form-check mb-2"><input class="form-check-input" type="checkbox" name="options[<?= $index ?>][remove_image]" value="1"> Remove photo</label><?php endif; ?>
            <label class="form-label" for="photo-<?= $option['id'] ?>">Choice photo</label><input class="form-control" id="photo-<?= $option['id'] ?>" type="file" name="option_image_<?= $option['id'] ?>" accept="image/jpeg,image/png,image/webp">
        </div></div>
    <?php endforeach; ?>
    </div>
    <button class="btn btn-success mt-3" type="submit">Save checklist</button>
</form>
</details>
<?php endforeach; ?>
