# Photo uploads and Android navigation — 2.0.0+79

Requested scope only: remove automatic photo-quality rejection and remove the Android Dashboard. The website Dashboard, database schema, health scoring, role permissions, and password visibility implementation were not edited. Existing unrelated workspace changes were preserved.

Photo selection and final submission no longer assess blur, motion blur, brightness, contrast, or minimum quality resolution. JPG, PNG and WebP, 5 MB per file, 12 MB total, 10 photos total (two required views and up to eight extras), decoding, metadata cleanup, duplicate checks, and private Storage remain. The existing photo-check endpoint now only enforces file safety and duplicates.

Guardians and experts open Submit Report after login. Administrators open All reports, as requested in the clarification. Android menu, tabs, account-registration continuation, and back handling use the new destinations. Other screens and notifications remain available.

## Modified files

- `mobile/flutter_app/assets/config/photo_quality.json` — Remove automatic visual-quality rules; retain supported formats, size/memory limits, decoding and bounded resizing.
- `mobile/flutter_app/lib/core/photo_quality.dart` — Remove automatic visual-quality rules; retain supported formats, size/memory limits, decoding and bounded resizing.
- `mobile/flutter_app/lib/core/prepare_photo.dart` — Remove automatic visual-quality rules; retain supported formats, size/memory limits, decoding and bounded resizing.
- `mobile/flutter_app/lib/core/report_photos.dart` — Use file safety validation and preserve count, size, decoding, and duplicate protections.
- `mobile/flutter_app/lib/screens/email_account_screen.dart` — Registration continuation copy names Submit Report.
- `mobile/flutter_app/lib/screens/home_shell.dart` — Remove Android Dashboard; default to Submit Report for guardians/experts and All reports for administrators; preserve other destinations and notification bell.
- `mobile/flutter_app/lib/screens/submit_report_screen.dart` — Remove quality status; select and append multiple extra photos with previews, limits, duplicate checks, and Android lost-selection recovery.
- `mobile/flutter_app/pubspec.yaml` — Release version 2.0.0+79.
- `mobile/flutter_app/test/email_account_test.dart` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `mobile/flutter_app/test/home_shell_navigation_test.dart` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `mobile/flutter_app/test/photo_quality_test.dart` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `mobile/flutter_app/test/prepare_photo_test.dart` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `mobile/flutter_app/test/registration_navigation_test.dart` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `mobile/flutter_app/test/report_photos_test.dart` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `mobile/flutter_app/test/report_review_test.dart` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `supabase/functions/api/core/images.js` — Accept positive image dimensions without a minimum quality resolution; preserve upper bounds, container validation, and metadata stripping.
- `supabase/functions/api/core/photo-quality-config.json` — Remove automatic visual-quality rules; retain supported formats, size/memory limits, decoding and bounded resizing.
- `supabase/functions/api/core/photo-quality-metrics.js` — Remove automatic visual-quality rules; retain supported formats, size/memory limits, decoding and bounded resizing.
- `supabase/functions/api/core/photo-quality.js` — Remove automatic visual-quality rules; retain supported formats, size/memory limits, decoding and bounded resizing.
- `supabase/functions/api/core/report-photos.js` — Use file safety validation and preserve count, size, decoding, and duplicate protections.
- `supabase/scripts/sync-photo-quality.js` — Describe the remaining shared configuration as upload safety limits.
- `supabase/test/api-integration.mjs` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `supabase/test/photo-quality.test.js` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `supabase/test/trait-catalog.test.js` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.
- `supabase/web/src/photo-quality.js` — Remove automatic visual-quality rules; retain supported formats, size/memory limits, decoding and bounded resizing.
- `supabase/web/src/report-form.js` — Remove quality-check status wording; preserve the existing multiple-selection, append, preview, and upload flow.
- `supabase/web/src/report-photos.js` — Use file safety validation and preserve count, size, decoding, and duplicate protections.
- `supabase/web/test/forms.test.js` — Regression coverage for photo acceptance, upload protections, batching, or the new Android destination.

## Generated release files

- `mobile/flutter_app/dist/ManGROOVES-Supabase.apk` and its `.json`/`.sha256` metadata.
- `vercel/dist/` website package, bundled assets, and matching APK download.
- This release report. Temporary backups, edit helpers and verification logs are under `tmp/photo-nav*` / `tmp/photo-navigation-before/`.

## Verification

- Supabase shared/backend/web tests: 202 passed, 0 failed.
- Local API integration: 102 checks passed, including submission, expert validation, private photo access, duplicate rejection, and final acceptance of all visual-quality regression fixtures. PostgreSQL runs locally through PGlite; Auth and Storage use explicit test doubles.
- Flutter release-gate tests: 167 passed, 0 failed, 1 existing optional LAN-discovery test skipped. Includes Android navigation, registration, password visibility, notifications, photo batching, draft restore, and complete report submission.
- Flutter analysis: no issues found.
- Deno Edge type check: passed. Deno HTTP smoke test: 1 passed.
- Root location tests: 25 passed, 0 failed.
- `git diff --check` on the scoped changes: passed.
- Website/PHP package tests: 28 passed, 0 failed, including unchanged website Dashboard navigation, sessions, notifications, private downloads, and APK availability.
- Android release build: successful, application ID `org.mangrooves.mobile`, version name `2.0.0`, version code `79`. APK signature verified and signing certificate SHA-256 matches the prior build.

Initial tests expecting quality rejection and Dashboard destinations were updated to match the requested behavior. A new Windows-path assertion was corrected. The website package gate initially refused the old APK/version mismatch, as intended; the final run against the new APK passed.

APK SHA-256: `37006b9a8c26542da35efc64a8afd0d8f13f11cfad90f56770a33a37dca989d8`.

Published on 19 November 2026 to https://mangrooves-php.vercel.app, including the Android APK download and the matching Supabase Edge API. Production deployment: https://mangrooves-jo7zth7an-clements-projects-5174d0c3.vercel.app.

The publisher verified public PHP pages, API configuration/explore responses, APK download headers and checksum metadata, and the exact production CORS origin. A fresh download of the deployed Edge function confirmed that all five changed backend photo-validation files match the tested local source.

Independent live verification completed at 11:48 AM Asia/Manila on 19 November 2026:

- The public PHP pages and configuration/explore API responses returned successfully.
- The served JavaScript bundle exactly matches the tested package. Removed quality warnings are absent; the multi-file photo input and website Dashboard continuation remain present.
- The full 60,465,305-byte APK download has the exact release SHA-256 above. Its checksum download also matches.
- The deployed API's five changed photo-validation files match the local source.

Evidence: `tmp/photo-nav-live-result.json`, `tmp/photo-nav-backend-result.json`, `tmp/photo-nav-release-build.log`, `tmp/photo-nav-publish.log`, and the corresponding test logs.

Device camera/gallery interactions were simulated in Flutter tests; no physical Android device was used. Android publication uses the existing direct APK download, not a Play Store release.
