<a class="small" href="<?= e(url('dashboard.php')) ?>">Back to dashboard</a>
<h1 class="h3 mt-2">Health checklist</h1>
<p class="text-body-secondary">Add, rename, or delete choices. Edit points and photos. Saved reports keep their original scores.</p>
<div class="card card-body mb-3">
    <h2 class="h5">Health score: 6 points</h2>
    <p class="mb-1">Leaf color + pests + roots. Each adds 0, 1, or 2 points.</p>
    <p class="mb-1"><strong>6 Healthy · 3–5 Stressed · 0–2 At Risk</strong></p>
    <p class="small mb-0">Not Sure: no score; needs review. None of the above: 0. All of the above: lowest score (0) for health; total of regular choices for context and environment. Context and environment do not change the health score.</p>
</div>
<?php if ($error): ?><div class="alert alert-danger" role="alert"><?= e($error) ?></div><?php endif; ?>
<?php foreach ($criteria as $criterion): ?>
<details class="card mb-3" id="criterion-<?= (int) $criterion['id'] ?>" <?= is_post() && (int) ($_POST['id'] ?? 0) === $criterion['id'] ? 'open' : '' ?>>
<summary class="card-header p-3"><strong><?= e($criterion['name']) ?></strong> <span class="badge text-bg-light ms-2"><?= $criterion['score_group'] === 'health' ? '0–2 health points' : 'Supporting observations' ?></span></summary>
<form class="card-body" data-checklist-editor method="post" enctype="multipart/form-data" data-confirm="Save added, edited, and deleted choices? Past reports stay unchanged.">
    <?= Csrf::field() ?>
    <input type="hidden" name="id" value="<?= (int) $criterion['id'] ?>"><input type="hidden" name="version" value="<?= e($criterion['version']) ?>">
    <div class="row g-3 mb-3">
        <div class="col-md-4"><label class="form-label" for="name-<?= $criterion['id'] ?>">Name</label><input class="form-control" id="name-<?= $criterion['id'] ?>" name="name" maxlength="120" value="<?= e($criterion['name']) ?>" required></div>
        <div class="col-md-8"><label class="form-label" for="question-<?= $criterion['id'] ?>">Question</label><input class="form-control" id="question-<?= $criterion['id'] ?>" name="question_text" maxlength="255" value="<?= e($criterion['question_text']) ?>" required></div>
        <div class="col-12"><label class="form-label" for="guide-<?= $criterion['id'] ?>">Guide photo</label><input class="form-control" id="guide-<?= $criterion['id'] ?>" type="file" name="guide_image" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, or WebP. Up to 5 MB.</small></div>
        <?php if ($criterion['guide_image']): ?><div class="col-12"><img class="img-fluid rounded" style="max-height:180px" src="<?= e(asset($criterion['guide_image'])) ?>" alt="Current guide"><label class="form-check mt-2"><input class="form-check-input" type="checkbox" name="remove_guide" value="1"> Remove guide photo</label></div><?php endif; ?>
    </div>
    <?php if ($criterion['score_group'] === 'health'): ?><p class="small">Keep at least one 0-point and one 2-point choice.</p><?php endif; ?>
    <div class="row g-3" data-choice-list>
    <?php foreach ($criterion['options'] as $index => $option): require APP_ROOT . '/app/Views/admin/checklist-choice.php'; endforeach; ?>
    </div>
    <template data-choice-template>
        <?php $index = '__INDEX__'; $option = ['id' => '__ID__', 'code' => '', 'label' => '', 'points' => 0, 'image_path' => null]; require APP_ROOT . '/app/Views/admin/checklist-choice.php'; ?>
    </template>
    <button class="btn btn-outline-success mt-3 me-2" type="button" data-add-choice>Add choice</button>
    <span class="small" data-choice-message role="status"></span>
    <button class="btn btn-success mt-3" type="submit">Save checklist</button>
</form>
</details>
<?php endforeach; ?>
