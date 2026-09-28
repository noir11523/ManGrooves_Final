<?php $reserved = in_array($option['code'], ['unknown', 'none_of_the_above', 'all_of_the_above'], true); $new = $option['id'] === '__ID__'; ?>
<div class="col-md-6 col-xl-4" data-choice-card>
<div class="border rounded p-3 h-100">
    <input type="hidden" name="options[<?= $index ?>][id]" value="<?= e($option['id']) ?>" data-choice-id>
    <input type="hidden" name="options[<?= $index ?>][delete]" value="0" data-choice-deleted>
    <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
        <strong data-choice-heading>Choice</strong>
        <button class="btn btn-outline-danger btn-sm" type="button" data-delete-choice>Delete choice</button>
    </div>
    <fieldset data-choice-fields>
        <?php if ($new): ?>
        <label class="form-label" for="kind-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>">Answer type</label>
        <select class="form-select mb-2" id="kind-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>" name="options[<?= $index ?>][kind]" data-choice-kind>
            <option value="standard">Regular choice</option>
            <option value="all_of_the_above">All choices</option>
            <option value="unknown">Not Sure (needs review)</option>
            <?php if ($criterion['selection_mode'] === 'multiple'): ?><option value="none_of_the_above">None of the above</option><?php endif; ?>
        </select>
        <?php endif; ?>
        <label class="form-label" for="choice-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>">Label</label>
        <input class="form-control mb-2" id="choice-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>" name="options[<?= $index ?>][label]" value="<?= e($option['label']) ?>" maxlength="190" required data-choice-label>
        <?php if ($reserved): ?>
            <input type="hidden" name="options[<?= $index ?>][points]" value="0">
            <p class="small mb-2"><?= $option['code'] === 'unknown' ? 'Not Sure rule: unscored; needs review.' : ($option['code'] === 'all_of_the_above' ? ($criterion['score_group'] === 'health' ? 'All choices rule: lowest score (0).' : 'All choices rule: totals regular choices.') : 'None rule: 0 points.') ?> Renaming keeps this rule.</p>
        <?php else: ?>
            <div data-choice-points-wrap><label class="form-label" for="points-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>">Points</label><input class="form-control mb-2" id="points-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>" type="number" name="options[<?= $index ?>][points]" min="<?= $criterion['score_group'] === 'health' ? 0 : -2 ?>" max="2" step="1" value="<?= $option['points'] ?>" required data-choice-points></div>
            <p class="small" data-choice-rule hidden></p>
        <?php endif; ?>
        <?php if ($option['image_path']): ?><img class="img-fluid rounded mb-2" style="max-height:120px" src="<?= e(asset($option['image_path'])) ?>" alt="<?= e($option['label']) ?>"><label class="form-check mb-2"><input class="form-check-input" type="checkbox" name="options[<?= $index ?>][remove_image]" value="1"> Remove photo</label><?php endif; ?>
        <label class="form-label" for="photo-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>">Choice photo</label><input class="form-control" id="photo-<?= (int) $criterion['id'] ?>-<?= e($option['id']) ?>" type="file" name="option_image_<?= e($option['id']) ?>" accept="image/jpeg,image/png,image/webp">
    </fieldset>
</div>
</div>
