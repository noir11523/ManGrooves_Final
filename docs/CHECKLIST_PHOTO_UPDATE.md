# Checklist, scoring and photo validation update

## Condition score

Only Leaf Color, Pests and Roots contribute points. Each contributes 0–2, so the maximum is **6**. The existing project rules remain: **6 Healthy; 3–5 Stressed; 0–2 At Risk**. An unscorable required indicator produces **Unknown**, not zero. “All of the above” uses the lowest regular score in that indicator.

Supporting observations—including animals, leaf damage, bark, environmental observations and custom Site Conditions—provide information for expert review. Their new points are always **0**, enforced by the backend. Selecting Not Sure in a supporting question does not erase an otherwise complete condition score. The contradictory combination of animals present and No Animals at All remains invalid.

Animal presence alone does not establish the condition of an individual tree. This is a project screening rubric, not a scientifically validated universal six-point index. Expert verification remains necessary. Supporting observations are retained for that decision rather than adding an arbitrary health bonus.

Report details show the saved total and suggested condition in Observations, separately from the expert’s final condition. Older saved null totals stay incomplete; neither historical reports nor their answers are rewritten. Confirm system suggestions is available only when both suggestions are known. Staff creation accepts Expert only.

## Ordering

Use the handle on an answer card to move it within its category; keyboard users can use arrow keys on the handle. Save changes persists the order. The complete card moves, including its ID, image input, label, points and special behavior. Category ordering is not redesigned.

The configured category and answer order is used by Step 3, Step 4 and report observations after reload. Removed historical definitions are appended using their saved order; saved answer labels and values are retained. Core trait fields on older reports use the existing display-label fallback where a historical label was not stored.

## Photos

Reports allow **10 photos total: two main photos and eight additional photos**. The existing limits remain **5 MB per photo, 12 MB combined and 6 megapixels per processed image**. Ten photos may require smaller files to fit the combined limit.

Android previously requested picker resizing to 2200 pixels and JPEG quality 85 before validation. Wide images could fall below the minimum shortest side. The picker now retains original bytes when within limits. Oversized pixel dimensions are reduced while preserving aspect ratio and at least 800 pixels on the shortest side; inadequate originals are never enlarged. Android uses lossless PNG for this bounded conversion and still rejects results exceeding 5 MB. Lost-picker recovery uses the same preparation.

Browser and native decoders can produce different sampled sharpness/brightness values. Client checks still validate file format, size, dimensions and decoding, but the mandatory API preflight makes the clarity decision. Final submission uses the same backend validator and exact prepared bytes. A failed preflight does not accept the candidate preview. Existing SHA-256 duplicate checks remain.

The additional motion check measures local gradient direction and high-frequency detail in a 16×16 grid. Widespread strongly directional edges without enough focused two-dimensional texture indicate motion trails. It supplements Laplacian and sharp-tile checks without raising their existing thresholds. This is a conservative rule-based heuristic, not recognition or a guarantee that every motion-blurred photograph will be detected.

### Configuration

Edit `supabase/functions/api/core/photo-quality-config.json` and mirror it to `mobile/flutter_app/assets/config/photo_quality.json`. Tests verify these configurations match.

| Setting | Current value | Purpose |
| --- | --- | --- |
| minSide | 800 | Minimum original shortest side |
| maxPixels | 6000000 | Backend processing bound |
| minLaplacian | 45 | Existing global sharpness threshold |
| minSharpTileLaplacian / minSharpTiles | 100 / 2 | Existing localized sharpness fallback |
| focusGrid | 16 | Local focus grid |
| minFocusEnergy | 25 | Minimum gradient energy |
| motionCoherence | 0.85 | Strong directional alignment |
| focusCoherence / minFocusRatio | 0.65 / 0.5 | Focused multidirectional texture |
| minMotionCells / minMotionFraction | 16 / 0.5 | Minimum widespread directional evidence |
| maxFocusedFraction | 0.06 | Reject only below this focused-cell fraction |

Brightness, contrast, format and size thresholds were not weakened. Adjust motion parameters only against a representative clear/blurred photo set. The synthetic light-trail fixture had Laplacian ≈199 and six sharp tiles (enough to pass the previous checks), but the new directional-focus rule rejects it. Clear JPG/PNG/WebP and the shallow-depth-of-field regression pass.

The exact attached light-trail photograph was not available as a local file for executable regression testing. `supabase/test/fixtures/quality/motion-trails.jpg` is explicitly synthetic; its reproducible recipe is in `generate.py`. No claim is made that the exact attachment was executed through the validator.

## Manual migration

`supabase/manual-migrations/supporting-points-zero.sql` is intentionally outside automatic migrations. **Back up the database, verify the backup, and obtain explicit approval before production execution.** It resets active supporting-choice definitions only, updates changed checklist versions and document/collection revisions, and is idempotent. It never updates reports, snapshots, verification logs or audit logs. Old forms referencing changed versions must reload. Runtime scoring already forces supporting points to zero for new reports without running this migration.

## Modified implementation files

- Backend: `domain.js`, `condition-score.js`, `observation-order.js`, `service.js`, `staff.js`, `trait-catalog.js`, `trait-images.js`, `api.js`, `report-photos.js`, `photo-quality-metrics.js`, `photo-quality-config.json` under `supabase/functions/api/core/`.
- Web: `admin.js`, `admin-lists.js`, `trait-controls.js`, `choice-order.js`, `app.js`, `report-form.js`, `condition-summary.js`, `observations.css`, `report-photos.js`, `photo-quality.js` under `supabase/web/src/`.
- Flutter: `lib/core/prepare_photo.dart`, `photo_quality.dart`, `report_photos.dart`; `lib/shared/condition_score.dart`; checklist, management, submit-report, verification and report-detail screens; mirrored photo-quality config.
- Regression coverage: domain, staff, API integration, checklist consistency/migration, photo quality, web forms/pages, drag handles/photo limits, Flutter condition display and photo preparation tests.

## Validation limitations

Automated DOM/widget tests do not replace physical Android camera/gallery or mobile-browser testing. No live database migration or production deployment was performed for this update. Test/build outcomes are recorded in the completion message; production rollout and real-device acceptance remain separate checks.

## Verification results (17 November 2026)

- Web/backend automated suite: **202 passed, 0 failed**.
- API integration: **101 checks passed**, including saved trait order, checklist synchronization, photo handling and historical-data safeguards.
- Flutter suite: **173 passed, 0 failed, 1 skipped**. The existing LAN-discovery integration test is opt-in (`RUN_LOCAL_DISCOVERY_TEST`) and was not enabled; it needs a local API server.
- Dart analysis: **No issues found**.
- Website production build: **passed**.
- Android debug APK build: **passed** (`mobile/flutter_app/build/app/outputs/flutter-apk/app-debug.apk`). This is a local debug build, not a published release.
- Supabase Edge type check: **passed**.
- Deno HTTP smoke test: **1 passed**, covering routing, CORS, authentication, PDFs and raster uploads.
- Whitespace/diff check: **passed** (Git only noted normal Windows line-ending conversion warnings).

These results cover automated tests and local builds. Physical phone camera/gallery testing, production deployment and the manual production migration have not been performed.
