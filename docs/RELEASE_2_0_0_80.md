# Cebu coverage and photo uploads — 2.0.0+80

Merged GitHub's monitoring coverage feature with the local photo-quality removal,
Android navigation changes, and clearer duplicate-photo messages in Details.
The upstream revert of mixed photo selection was resolved by retaining the working
multiple-file picker, append behavior, previews, and per-photo failure handling.

## Behavior

- Default coverage is Cebu City. The existing backend document can enable one or
  several Cebu cities/municipalities, or all Cebu. See
  [MONITORING_SITE_COVERAGE.md](../supabase/MONITORING_SITE_COVERAGE.md) for SQL examples.
- Details and Location disable Continue for a selected pin outside coverage,
  during its lookup, or after a failed lookup. Change location and Retry address
  allow recovery. Fresh Details without a pin can reach Location to choose one.
- Coordinates determine eligibility. Typed names, search labels, home addresses,
  and restored drafts cannot establish eligibility. Submission checks the current
  configuration again, including inside the database transaction.
- Automatic blur, motion blur, exposure, contrast, and minimum-resolution rejection
  remain removed. Required overview/close-up, multiple additional photos, JPG/PNG/WebP,
  size/count limits, decoding, duplicate detection and private Storage remain.
- Android Dashboard remains removed. Guardians/experts open Submit Report and
  administrators open All reports. The website Dashboard is unchanged.
- No database schema, health scoring, or password visibility changes.

## Files

Earlier photo/navigation changes committed with this merge are listed individually
in [RELEASE_2_0_0_79.md](RELEASE_2_0_0_79.md). Additional files in this release:

- `supabase/MONITORING_SITE_COVERAGE.md`: simple backend coverage instructions.
- `supabase/functions/api/core/monitoring-site-coverage.js`: default, selected-city,
  and province rules; public configuration and location messages.
- `supabase/functions/api/core/service.js`: filter report sites, expose coverage,
  enforce it before submission and during the save transaction.
- `supabase/functions/api/core/sites.js`: enforce coverage when creating/moving sites;
  retain existing records.
- `supabase/functions/api/core/places.js`: check actual coordinates against current
  coverage outside the geocoder cache; retain rate limiting.
- `supabase/web/src/report-form.js`: block Continue in both steps and allow pin recovery;
  preserve multi-photo appending and clarified duplicate messages.
- `mobile/flutter_app/lib/screens/submit_report_screen.dart`: matching Flutter
  coverage guards, failed-lookup recovery, and draft revalidation.
- `mobile/flutter_app/pubspec.yaml`: release version 2.0.0+80.
- `supabase/test/monitoring-site-coverage.test.js`: default/configured coverage,
  cache changes, coordinate decisions, and existing-site behavior.
- `supabase/test/api-integration.mjs`: default, selected-city, province, and stale
  submission checks against local PostgreSQL.
- `supabase/test/trait-catalog.test.js`: include real city/province fields in the site fixture.
- `supabase/web/test/forms.test.js`: both Continue guards, pin recovery, and batched photos.
- `mobile/flutter_app/test/report_review_test.dart`: both step guards and retry recovery.
- `docs/RELEASE_2_0_0_80.md`: this release record.

## Verification

- Backend/web: 211 tests passed.
- Local API: 103 checks passed. PostgreSQL runs through PGlite; Auth/Storage are
  explicit test doubles. Includes report submission and expert validation.
- Final Flutter release gate: 168 tests passed, one existing optional LAN test skipped.
- Flutter analysis: no issues found.
- Deno Edge type check passed; HTTP runtime smoke test: one passed.
- Focused coverage and existing root location tests: 32 passed.
- Scoped whitespace/conflict checks passed.
- Website/PHP package: 28 tests passed, including the unchanged website Dashboard.
- Android release build succeeded: application `org.mangrooves.mobile`, version
  name `2.0.0`, version code `80`. Signature verification passed; certificate
  matches the previous direct-download build (existing Android debug certificate).
- APK size: 60,465,305 bytes. SHA-256:
  `24eb47054c0bfa2099b3a74d72dd5a934f884c7f51382f7f37051ea9544151f9`.

Initial sandbox subprocess restrictions required rerunning Node/Deno tests with
the appropriate permission. One site fixture lacked the newly required geographic
fields; that test fixture was corrected and the full suite then passed.

Physical Android camera/gallery testing and Play Store publication are not part
of this verification. Android distribution uses the existing direct APK download.

## MySQL reference

The active backend is Supabase/PostgreSQL. The old MySQL implementation is archived
at `C:\xampp\htdocs\ManGROOVES-legacy-archive-2026-11-17`, notably
`app/Core/Database.php` (PDO MySQL connection), `database/schema.sql`,
`database/migrations/`, `app/Services/`, and `public/mobile-api/`.
The archive is not a complete standalone application; no MySQL migration was performed.
Unrelated local archive cleanup and user photos are excluded from these commits.
