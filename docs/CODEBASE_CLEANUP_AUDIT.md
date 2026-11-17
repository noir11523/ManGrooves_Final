# Safe cleanup audit - 17 November 2026

## Scope and safety

Reviewed the repository tree, tracked-file inventory, dependency manifests, runtime entry points, build scripts, imports, tests, deployment scripts and documentation references before cleanup. Generated dependency internals were treated as package-managed files, not application source. No claim is made that every source line or production service was dynamically exercised.

Existing uncommitted checklist, scoring and photo changes were present before this cleanup and are preserved. Uploaded images, backups, migrations, credentials, environment files, APK release files and production data are not cleanup targets.

## Confirmed removal candidates (recorded before deletion)

1. `cupertino_icons` in `mobile/flutter_app/pubspec.yaml`: no CupertinoIcons usage, package import, asset reference or documentation requirement found. The generated dependency graph lists only the application as a consumer; no other package requires it. Retain Material icons, all functional Flutter dependencies and the Android/iOS build folders. Refresh the lockfile offline without upgrading other packages.
2. The twelve older `tmp/checklist77*` logs listed below: superseded intermediate test/compiler diagnostics from the previous work. No application/build/test/documentation reference to their exact names. Final test logs remain. No entire tmp-directory cleanup: it also holds backups and study evidence.
3. Sixteen files under `mobile/android-apk/build/`: generated classes, generated R.java, dex, temporary unsigned/aligned APKs and resource archive. Its own build.ps1 deletes and recreates this exact directory before building (lines 34-48). No current Flutter/Vercel/Supabase consumer. Keep old wrapper source, README, dist APK and keystore unchanged.

| File | Bytes |
| --- | ---: |
| `tmp/checklist77-api.log` | 16376 |
| `tmp/checklist77-apk.log` | 7816 |
| `tmp/checklist77-build.log` | 168 |
| `tmp/checklist77-dart.log` | 86 |
| `tmp/checklist77-edge.log` | 916 |
| `tmp/checklist77-extra-tests.log` | 1086 |
| `tmp/checklist77-fixed-tests.log` | 196 |
| `tmp/checklist77-flutter-analyze.log` | 2186 |
| `tmp/checklist77-flutter-tests.log` | 108760 |
| `tmp/checklist77-focused.log` | 4894 |
| `tmp/checklist77-gradle-threads.log` | 674804 |
| `tmp/checklist77-tests.log` | 38400 |
| `mobile/android-apk/build/classes/org/mangrooves/community/MainActivity$1.class` | 1913 |
| `mobile/android-apk/build/classes/org/mangrooves/community/MainActivity$2.class` | 2772 |
| `mobile/android-apk/build/classes/org/mangrooves/community/MainActivity.class` | 9027 |
| `mobile/android-apk/build/classes/org/mangrooves/community/R$color.class` | 417 |
| `mobile/android-apk/build/classes/org/mangrooves/community/R$drawable.class` | 350 |
| `mobile/android-apk/build/classes/org/mangrooves/community/R$mipmap.class` | 335 |
| `mobile/android-apk/build/classes/org/mangrooves/community/R$string.class` | 472 |
| `mobile/android-apk/build/classes/org/mangrooves/community/R$style.class` | 338 |
| `mobile/android-apk/build/classes/org/mangrooves/community/R$xml.class` | 341 |
| `mobile/android-apk/build/classes/org/mangrooves/community/R.class` | 554 |
| `mobile/android-apk/build/classes.jar` | 10745 |
| `mobile/android-apk/build/dex/classes.dex` | 11808 |
| `mobile/android-apk/build/generated/org/mangrooves/community/R.java` | 1232 |
| `mobile/android-apk/build/ManGROOVES-aligned.apk` | 11083 |
| `mobile/android-apk/build/ManGROOVES-unsigned.apk` | 11082 |
| `mobile/android-apk/build/resources.zip` | 6702 |

## Retained or uncertain items

- `app/Core/Database.php`, `app/Services/`, legacy public PHP routes, `config/app.php`, `database/` and PHP maintenance scripts: still referenced by the explicit legacy launcher, PHP tests and documented installation/rollback workflows. They are not proven dead code. Removing them would change a supported behavior.
- `app/Cloud/`, selected `app/Core/` helpers, views and `public/assets/`: used by `vercel/build.mjs`; PHP is still part of the active website. Never delete the entire app/public tree as legacy.
- Supabase `convert-mysql.js`, `import-mysql.js` and PHP export scripts: referenced by migration runner, migration tests and migration documentation. These are data recovery/transfer tools, not redundant live MySQL connections.
- `firebase/`, Firebase hosting configurations and mobile Firebase adapter: retained rollback code and an explicitly selectable Flutter backend. Firebase CLI also publishes the existing Supabase static website via firebase.supabase-hosting.json.
- `mobile/android-apk/` source: an old native WebView wrapper, distinct from Flutter. It has its own documented build and signing assets, so only reproducible intermediate output is removed.
- `mobile/flutter_app/android/`, Gradle wrapper/configuration, SDK settings, signing files, iOS folder and generated plugin configuration: required platform/build support; retained.
- `supabase/functions/api/core.zip`, root JPG files, docs/diagrams, release packages and .vscode: ownership/purpose or backup value uncertain; retained.
- All environment/configuration secrets, backups, migrations, uploaded files, session files, .git, build-tool caches and documented evidence: retained.

## Supabase and dependency review

The Edge entry point creates a shared service client for database/storage and a separate session-isolated Auth client factory. This separation prevents OTP sessions from replacing shared administrator authentication; do not combine them. The database adapter uses PostgreSQL RPCs and intentionally exposes a collection-style API. Similar Firebase method names do not mean it is an unused Firebase implementation.

Vercel embeds the shared Supabase web modules and swaps the browser client for the PHP session proxy. These are distinct access paths, not duplicate unused APIs. Preserve the proxy and the shared code.

Retain all Node dependencies: Supabase SDK (Auth/data/storage), Photon (photo checks), Express/Busboy (API/uploads), Nodemailer (email), pdf-lib/QRCode (reports/certificates), Chart.js/Leaflet (charts/maps), and the existing build/test/deployment tools (esbuild, PostCSS, PGlite, jsdom, fake-indexeddb, Deno, Supabase CLI, Vercel CLI). Firebase rollback dependencies remain with their referenced consumers.

Retain Flutter http, secure storage, path provider, image picker, geolocator, intl, fl_chart, flutter_map, latlong2, url_launcher and printing, plus Flutter test/lint tools. Only the unused Cupertino font package is removed.

## Performance: separate from cleanup

No live performance bottleneck was established in this cleanup. Supabase Pro is a service tier, not proof of faster application requests. The existing database CPU recovery document records a previously fixed conflict-retry issue; its migration and bounded retry logic must remain. Removing local build intermediates/logs improves workspace navigation and disk use, not server response time. No query, caching, connection, scoring or rendering behavior is changed, and no speed improvement is claimed.

## Repository inventory

Tracked files before cleanup, grouped by top-level folder (uncommitted additions reviewed separately):

- `(root)`: 7 files
- `analytics`: 1 files
- `app`: 91 files
- `config`: 1 files
- `database`: 8 files
- `deploy`: 1 files
- `docs`: 61 files
- `firebase`: 35 files
- `mobile`: 183 files
- `public`: 165 files
- `scripts`: 21 files
- `storage`: 3 files
- `supabase`: 170 files
- `tests`: 8 files
- `vercel`: 14 files

## Test results

- Removed 28 audited diagnostic/generated files: 924,859 bytes (about 0.88 MiB). Removed their now-empty obsolete build directory. Final diagnostic logs, old wrapper source, dist APK, keystore and all backups were retained.
- Offline Flutter dependency refresh removed only `cupertino_icons` 1.0.9; no other dependency version changed.
- Backend/shared website: **202 tests passed**.
- Supabase API integration against isolated PGlite: **101 checks passed**; Auth/Storage are test doubles.
- Legacy JavaScript UI helpers: **49 tests passed**.
- Flutter: **173 tests passed**, **1 opt-in LAN-discovery test skipped**. Dart analysis: **no issues**.
- Supabase web build and Edge type check: **passed**. Deno HTTP smoke test: **1 passed**.
- The Vercel test harness needed its Chart stub updated for existing theme hooks (`register`/`instances`), and its old map-search assertion updated to the existing report-filter screen. These are test-only corrections; application behavior is unchanged. Browser module checks: **10 passed**. **28 packaged PHP/web tests passed** after the fresh release build.
- Legacy PHP/MySQL tests were attempted with a uniquely named disposable database; connection failed because the configured local MySQL server is not listening. No database was created, dropped or changed. The legacy MySQL end-to-end suite shares that unavailable prerequisite and was not run.
- Git diff whitespace check passed; normal Windows line-ending notices only.

## Release scope

The requested publication also includes the previously completed checklist/photo/scoring work documented in `CHECKLIST_PHOTO_UPDATE.md`. Those feature changes are separate from this cleanup. Android release is incremented to **2.0.0+77** so installed apps can update. Production data and the manual supporting-choice migration are not modified by cleanup or publishing. The SQL cleanup remains manual until a verified backup and explicit migration approval are supplied.

## Release validation

- Android release build **2.0.0+77 passed**. Package manifest confirms `org.mangrooves.mobile`, version code 77, version name 2.0.0. The previous APK and metadata were copied to the ignored `backups/release-before-2.0.0-77/` folder before replacement.
- Existing headless browser map-layout regression: **28 layouts passed** across embedded/standalone pages and 320/390/768/1280-pixel viewports, including long labels, keyboard interaction and overflow checks. The first restricted run timed out connecting to Chrome; the permitted retry passed.

- **28 packaged PHP/web tests passed** against the fresh APK/website package.
- APK signature verified and matches the previous release certificate.
- Published feature/cleanup commit `b796e87` to GitHub `main`.
- Production Vercel website and Android 2.0.0+77 download published; matching Supabase API version **151 ACTIVE**.
- **12 read-only live checks passed**, including full APK download checksum. Details and deployment URL are in `RELEASE_2_0_0_77.md`.
- No production database migration was run. Unrelated local JPGs, diagram artifacts, generated analytics edits, editor settings and the uncertain core.zip archive were left untouched and excluded from the release commit.
