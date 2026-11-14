# Report photo quality

Site overview, close-up, camera, gallery and additional report photos use the same policy. This checks image quality only. It does not recognize mangroves, species, people, or any other subject.

## Upload flow

1. Show **Checking photo quality...** and disable proceeding while checking.
2. Decode and check locally where supported. Run the server preflight before accepting the candidate into the draft preview.
3. On failure, show the specific error. Keep any previously accepted replacement photo; the rejected candidate is not added or stored.
4. On success, show **Photo quality passed.** and a clickable preview. The X removes a draft photo.
5. Repeat server validation on final submission before writing any images, reports or photo claims. A direct API request cannot bypass this check.

The free Photon Rust/WASM decoder (`@cf-wasm/photon` 0.4.0) decodes JPEG, PNG and WebP on the server. Browser Canvas and Flutter's native image decoder perform local checks. No paid service, AI classification, or image-content recognition is used. ID and checklist reference photos retain their existing separate validation.

## Adjust thresholds

Edit `supabase/functions/api/core/photo-quality-config.json`. The browser imports this policy directly. Run `node supabase/scripts/sync-photo-quality.js` to copy it to `mobile/flutter_app/assets/config/photo_quality.json`, then rebuild/redeploy the API, website and Android app. A test checks both JSON files remain identical.

| Setting | Default | Meaning |
| --- | ---: | --- |
| `maxBytes` | 5242880 | 5 MB per photo |
| `minSide` | 800 | Minimum pixels on the shortest side |
| `maxPixels` | 6000000 | Server decode safety limit; large browser uploads are resized automatically |
| `uploadSide` | 2200 | Longest side for large browser uploads; aspect ratio and 800px minimum are preserved |
| `sampleSide` | 512 | Longest analysis side; preserves aspect ratio |
| `minLaplacian` | 45 | Minimum whole-image Laplacian variance |
| `tileGrid` | 4 | Analyze 16 regions for local sharpness |
| `minSharpTileLaplacian` | 100 | Minimum local variance in a sharp region |
| `minGradient` | 3 | Minimum average gradient for a sharp region |
| `minSharpTiles` | 2 | Sharp regions needed when whole-image variance is below 45 |
| `minBrightness` / `darkPercentile` | 22 / 45 | Reject when mean brightness is below 22 AND the 95th percentile is below 45 |
| `maxBrightness` / `brightPercentile` | 240 / 220 | Reject when mean is above 240 AND the 5th percentile is above 220 |
| `minContrast` / `minTonalRange` | 9 / 22 | Reject when standard deviation is below 9 OR the 5th–95th percentile range is below 22 |

Pixels are converted to luminance (0–255). The four-neighbor Laplacian variance measures sharpness. Alpha is composited onto white. The regional sharpness alternative allows a clear close-up with a blurred background. It does not identify which object is the intended subject. Raising sharpness/contrast minimums rejects more photos; lowering them accepts more. Server decisions are authoritative because decoder/resampling differences can slightly change local scores.

The browser checks the original file size, resolution and quality before resizing images above six megapixels. The resized image is checked again locally and on the server. Android already uses a 2200px image-picker limit. A direct API request above six megapixels is rejected before decoding; unusual panoramas that cannot retain an 800px short side within the limit must be resized/cropped by the user.

The existing limits of six photos and 12 MB combined per report still apply. Unsupported bytes, corrupt containers, failed image decoding and oversized images are rejected before storage. Large images are checked sequentially to limit memory use.

## Regression and calibration

Fixtures in `supabase/test/fixtures/quality` use the existing repository leaf photo (`public/assets/img/observations/v1-green-leaf.jpg`), with synthetic blur, exposure, contrast and resolution changes. `generate.py` regenerates them with Pillow. These are calibration examples, not an accuracy study across all cameras or lighting conditions.

Expected: clear JPG/PNG/WebP and a sharp central close-up pass; blur, out-of-focus, dark, white overexposure, low contrast and 640px images fail. The close-up's global variance is about 34 (below 45), but three sharp regions allow it to pass. Tests also exercise corrupt/unsupported data, server bypass attempts, no permanent writes on failure, preview removal and preview enlargement.

Run:

```text
cd supabase
npm test
npm run test:api
cd ../mobile/flutter_app
flutter test test/photo_quality_test.dart test/report_photos_test.dart test/checklist_management_test.dart
```

Before tightening thresholds, test additional representative field photos on both clients and the server. Pixel metrics cannot guarantee that every visually unclear photo is detected, or that every useful photo passes. No recognition claim is made.

## Location fallback

The web and app first request precise device positioning, then try lower-power device positioning after three seconds. A fresh coarse device estimate is shown as approximate and requires the user to check/select the pin. A desktop network-area fallback only centers the map; it is never saved as an exact GPS fix. Permission denial and unavailable device positioning still require search or manual pin placement. Moving/selecting a pin refreshes its address; unresolved addresses cannot become named shared sites.

## Implementation files

| Area | Files |
| --- | --- |
| Shared policy and pixel metrics | `supabase/functions/api/core/photo-quality-config.json`, `photo-quality-metrics.js` |
| Server decoder and enforcement | `supabase/functions/api/core/photo-quality.js`, `report-photos.js`, `uploads.js`, `api.js` |
| Browser validation, resizing, zoom and removal | `supabase/web/src/photo-quality.js`, `report-photos.js`, `photo-preview.js`, `report-form.js` |
| Android quality, zoom and removal | `mobile/flutter_app/lib/core/photo_quality.dart`, `report_photos.dart`, `lib/screens/submit_report_screen.dart` |
| New category choice photos | `supabase/web/src/trait-controls.js`, `supabase/functions/api/core/trait-images.js`, `trait-catalog.js`, `mobile/flutter_app/lib/screens/checklist_screen.dart` |
| Layout and GPS fallback | `supabase/web/src/refinements.css`, `report-form.js`, `public/assets/js/live-location.js`, `mobile/flutter_app/lib/screens/submit_report_screen.dart` |
| Configuration and tests | `supabase/scripts/sync-photo-quality.js`, dependency manifests/locks, Android asset manifest, photo quality fixtures and API/browser/Flutter regression tests |
