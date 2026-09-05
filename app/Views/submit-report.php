<?php

declare(strict_types=1);

$extraHead = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">';
$pageScripts = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>'
    . '<script src="' . e(asset('js/report-wizard.js')) . '"></script>';
$oldObservations = old('observations', []);
$oldObservations = is_array($oldObservations) ? $oldObservations : [];
$selectedCluster = (string) old('cluster_id', $prefill['cluster_id'] ?? '');
$selectedParent = (string) old('parent_report_id', $prefill['parent_report_id'] ?? '');
?>

<section class="mb-4">
    <a class="small text-decoration-none" href="<?= e(url('dashboard.php')) ?>"><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Dashboard</a>
    <h1 class="h2 mt-2 mb-1">Submit a mangrove report</h1>
    <p class="text-body-secondary mb-0">Complete all three steps. Your report stays <strong>pending</strong> until an expert verifies it.</p>
</section>

<?php if ($errors): ?>
    <div class="alert alert-danger" role="alert" tabindex="-1" data-form-errors>
        <h2 class="h6">Please correct the following:</h2>
        <ul class="mb-0"><?php foreach ($errors as $error): ?><li><?= e($error) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<form method="post" enctype="multipart/form-data" novalidate
      data-report-wizard
      data-health-preview-url="<?= e(url('api/health-preview.php')) ?>"
      data-species-match-url="<?= e(url('api/species-match.php')) ?>"
      data-previous-reports-url="<?= e(url('api/previous-reports.php')) ?>"
      data-selected-parent="<?= e($selectedParent) ?>"
      data-max-photo-bytes="<?= (int) config('uploads.max_bytes', 5242880) ?>">
    <?= Csrf::field() ?>
    <input type="hidden" name="MAX_FILE_SIZE" value="<?= (int) config('uploads.max_bytes', 5242880) ?>">

    <nav class="card border-0 shadow-sm mb-4" aria-label="Report steps">
        <div class="card-body">
            <div class="progress mb-3" role="progressbar" aria-label="Report completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="33" data-wizard-progress>
                <div class="progress-bar bg-success" style="width:33%"></div>
            </div>
            <ol class="row list-unstyled mb-0 text-center small">
                <li class="col fw-semibold text-success" data-step-indicator="1"><span class="badge rounded-pill text-bg-success me-1">1</span>Location & photo</li>
                <li class="col text-body-secondary" data-step-indicator="2"><span class="badge rounded-pill text-bg-secondary me-1">2</span>Health checklist</li>
                <li class="col text-body-secondary" data-step-indicator="3"><span class="badge rounded-pill text-bg-secondary me-1">3</span>Species traits</li>
            </ol>
        </div>
    </nav>

    <section data-step-panel="1" aria-labelledby="step-one-title">
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-lg-4">
                <h2 class="h4" id="step-one-title">1. Location and photo evidence</h2>
                <p class="text-body-secondary">Use live GPS where possible. If it is unavailable, choose manual pin and tap the exact observation spot on the map.</p>

                <div class="row g-3">
                    <div class="col-lg-7">
                        <label class="form-label" for="cluster_id">Mangrove cluster</label>
                        <select class="form-select" id="cluster_id" name="cluster_id" data-cluster-select>
                            <option value="">New observation site (not yet assigned)</option>
                            <?php foreach ($clusters as $cluster): ?>
                                <option value="<?= (int) $cluster['id'] ?>"
                                        data-lat="<?= e($cluster['center_lat']) ?>"
                                        data-lng="<?= e($cluster['center_lng']) ?>"
                                        <?= $selectedCluster === (string) $cluster['id'] ? 'selected' : '' ?>>
                                    <?= e($cluster['cluster_code'] . ' — ' . $cluster['name']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <div class="form-text">Choose the known cluster, or leave this as a new site for expert assignment.</div>
                    </div>
                    <div class="col-lg-5">
                        <label class="form-label" for="parent_report_id">Follow-up to a verified report</label>
                        <select class="form-select" id="parent_report_id" name="parent_report_id" data-parent-report>
                            <option value="">Not a follow-up</option>
                            <?php if ($selectedParent): ?><option value="<?= e($selectedParent) ?>" selected>Loading selected report…</option><?php endif; ?>
                        </select>
                        <div class="form-text" data-followup-help>Selecting a cluster loads your verified reports.</div>
                    </div>
                    <div class="col-12">
                        <label class="form-label" for="sitio_name">Sitio or location name</label>
                        <input class="form-control" id="sitio_name" name="sitio_name" maxlength="120" required value="<?= e(old('sitio_name')) ?>" placeholder="Example: Sitio Seaside boardwalk">
                    </div>
                </div>

                <hr class="my-4">
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <button class="btn btn-success" type="button" data-use-gps><i class="bi bi-crosshair me-2" aria-hidden="true"></i>Use my live location</button>
                    <button class="btn btn-outline-success" type="button" data-use-manual><i class="bi bi-pin-map me-2" aria-hidden="true"></i>Place pin manually</button>
                    <span class="align-self-center small text-body-secondary" role="status" aria-live="polite" data-location-status>No location selected.</span>
                </div>
                <input type="hidden" name="location_source" value="<?= e(old('location_source')) ?>" data-location-source>
                <input type="hidden" name="location_accuracy" value="<?= e(old('location_accuracy')) ?>" data-location-accuracy>
                <div class="row g-3 mb-3">
                    <div class="col-sm-6">
                        <label class="form-label" for="latitude">Latitude</label>
                        <input class="form-control" id="latitude" name="latitude" inputmode="decimal" readonly required value="<?= e(old('latitude')) ?>" data-latitude>
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label" for="longitude">Longitude</label>
                        <input class="form-control" id="longitude" name="longitude" inputmode="decimal" readonly required value="<?= e(old('longitude')) ?>" data-longitude>
                    </div>
                </div>
                <div class="rounded border mb-4" style="min-height:330px" data-location-map aria-label="Map for choosing the report location"></div>

                <label class="form-label" for="photo">Mangrove photo</label>
                <input class="form-control" type="file" id="photo" name="photo" required accept="image/jpeg,image/png,image/webp" capture="environment" data-photo-input>
                <div class="form-text">JPG, PNG, or WebP; up to <?= e((string) round((int) config('uploads.max_bytes', 5242880) / 1048576, 1)) ?> MB. Show the leaves, trunk, and roots clearly.</div>
                <div class="mt-3" data-photo-preview hidden></div>
            </div>
        </div>
    </section>

    <section data-step-panel="2" aria-labelledby="step-two-title" hidden>
        <div class="mb-3">
            <h2 class="h4" id="step-two-title">2. Health and environmental checklist</h2>
            <p class="text-body-secondary">Leaf color, pests, and roots determine the 6-point health result. Context and environmental answers are recorded separately.</p>
        </div>
        <?php foreach ($criteria as $criterion): ?>
            <?php
                $code = (string) $criterion['code'];
                $selected = $oldObservations[$code] ?? [];
                $selected = is_array($selected) ? array_map('strval', $selected) : [(string) $selected];
                $multiple = $criterion['selection_mode'] === 'multiple';
                $groupLabel = match ($criterion['score_group']) {
                    'health' => 'Health score',
                    'environment' => 'Environmental observation',
                    default => 'Context only',
                };
            ?>
            <fieldset class="card border-0 shadow-sm mb-3" data-criteria-code="<?= e($code) ?>">
                <div class="row g-0">
                    <?php if (!empty($criterion['guide_image'])): ?>
                        <div class="col-md-4 col-lg-3">
                            <img class="w-100 h-100 object-fit-cover rounded-start" style="max-height:260px" src="<?= e(asset((string) $criterion['guide_image'])) ?>" alt="Visual guide for <?= e($criterion['name']) ?>" loading="lazy">
                        </div>
                    <?php endif; ?>
                    <div class="<?= !empty($criterion['guide_image']) ? 'col-md-8 col-lg-9' : 'col-12' ?>">
                        <div class="card-body p-lg-4">
                            <div class="d-flex flex-wrap gap-2 align-items-center mb-1">
                                <legend class="h5 float-none w-auto mb-0"><?= e($criterion['name']) ?></legend>
                                <span class="badge text-bg-light border"><?= e($groupLabel) ?></span>
                            </div>
                            <p class="text-body-secondary"><?= e($criterion['question_text']) ?> <?= $multiple ? 'Select every answer that applies.' : '' ?></p>
                            <div class="row g-2">
                                <?php foreach ($criterion['options'] as $index => $option): ?>
                                    <?php
                                        $inputId = 'observation_' . $criterion['id'] . '_' . $option['id'];
                                        $inputName = 'observations[' . $code . ']' . ($multiple ? '[]' : '');
                                    ?>
                                    <div class="col-sm-6 col-xl-4">
                                        <input class="btn-check" type="<?= $multiple ? 'checkbox' : 'radio' ?>"
                                               id="<?= e($inputId) ?>" name="<?= e($inputName) ?>"
                                               value="<?= (int) $option['id'] ?>"
                                               data-option-code="<?= e($option['code']) ?>"
                                               <?= in_array((string) $option['id'], $selected, true) ? 'checked' : '' ?>
                                               <?= !$multiple && $index === 0 ? 'required' : '' ?>>
                                        <label class="btn btn-outline-success text-start w-100 h-100" for="<?= e($inputId) ?>"><?= e($option['label']) ?></label>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </fieldset>
        <?php endforeach; ?>
        <div class="alert alert-light border d-flex align-items-center justify-content-between gap-3" aria-live="polite" data-health-preview>
            <span>Complete the single-choice checklist to preview the canonical health result.</span>
        </div>
    </section>

    <section data-step-panel="3" aria-labelledby="step-three-title" hidden>
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-lg-4">
                <h2 class="h4" id="step-three-title">3. Species traits and notes</h2>
                <p class="text-body-secondary">Choose what you can see. The system ranks normalized trait matches; an expert makes the final identification.</p>
                <div class="row g-3">
                    <?php foreach (['root_type' => 'Root type', 'leaf_shape' => 'Leaf shape', 'bark_texture' => 'Bark texture'] as $field => $label): ?>
                        <div class="col-lg-4">
                            <label class="form-label" for="<?= e($field) ?>"><?= e($label) ?></label>
                            <select class="form-select" id="<?= e($field) ?>" name="<?= e($field) ?>" required data-species-trait>
                                <option value="">Choose <?= e(mb_strtolower($label)) ?></option>
                                <?php foreach ($traits[$field] as $value): ?>
                                    <option value="<?= e($value) ?>" <?= (string) old($field) === (string) $value ? 'selected' : '' ?>><?= e($value) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    <?php endforeach; ?>
                    <div class="col-sm-6">
                        <label class="form-label" for="observed_alive_count">Mangroves observed alive</label>
                        <input class="form-control" id="observed_alive_count" name="observed_alive_count" type="number" min="0" max="1000000" step="1" value="<?= e(old('observed_alive_count')) ?>" required aria-describedby="alive-count-help">
                        <div class="form-text" id="alive-count-help">Enter the count from this visit. A new site needs at least one living mangrove to establish its baseline; an existing site may record zero.</div>
                    </div>
                    <div class="col-12">
                        <label class="form-label" for="guardian_remarks">Guardian remarks <span class="text-body-secondary">(optional)</span></label>
                        <textarea class="form-control" id="guardian_remarks" name="guardian_remarks" maxlength="5000" rows="4" placeholder="Describe erosion, trash, recent weather, or anything an expert should know."><?= e(old('guardian_remarks')) ?></textarea>
                    </div>
                </div>
                <div class="alert alert-light border mt-3 mb-0" aria-live="polite" data-species-preview>Choose all three traits to preview ranked species matches.</div>
            </div>
        </div>
        <div class="form-check mb-4">
            <input class="form-check-input" type="checkbox" name="field_confirmation" value="1" id="confirmation" required <?= (string) old('field_confirmation') === '1' ? 'checked' : '' ?>>
            <label class="form-check-label" for="confirmation">I confirm that the photo, location, and observations are from this field visit.</label>
        </div>
    </section>

    <div class="d-flex justify-content-between gap-3 sticky-bottom bg-body py-3 border-top">
        <button class="btn btn-outline-secondary" type="button" data-step-back hidden><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Back</button>
        <span class="ms-auto"></span>
        <button class="btn btn-success" type="button" data-step-next>Continue<i class="bi bi-arrow-right ms-1" aria-hidden="true"></i></button>
        <button class="btn btn-success btn-lg" type="submit" data-submit-report hidden><i class="bi bi-send me-2" aria-hidden="true"></i>Submit for verification</button>
    </div>
</form>
