# ManGROOVES 2.0.0+40 implementation audit

This release completes the reporting and follow-up changes on the existing
Supabase-backed PHP website and Flutter Android app. The final audit also fixed
an overflowing mobile step label, the scoped web image-preview dialog, PHP
follow-up rendering, image restoration through the PHP proxy, and inconsistent
APK analytics labels.

## Request coverage

| Request | Implemented behavior |
| --- | --- |
| Automatic location and manual pin | Both controls remain. Browser/device positioning comes first; only desktop web can fall back to an approximate IP estimate. Approximate coordinates require a confirmed manual pin before submission. |
| Address loading and speed | A loading message accompanies reverse lookup; stale results cannot overwrite a newer pin. Repeated searches are cached. Search favors the account's barangay/Cebu without restricting results to Cebu. |
| Saved and personal sites | Selecting a saved site supplies its canonical name and location. New guardian sites stay personal until staff approve sharing. Admins and experts can manage sites, see their creator, approve sharing, archive, and delete from selection while preserving report history. |
| Photos and desktop camera | Overview and close-up have separate Camera/Gallery controls. Desktop camera uses live video capture. Up to four additional photos are supported. Server checks reject repeated image content; retries of the same submission return its existing report. |
| Unable to count | Requires a saved site, as approved by the user. The count is stored as null/unknown, never zero. |
| Observation choices | Step 3 is Observations, with category buttons, image choices, and an enlarged preview before selecting. Admins can replace choice/feature images. Only visible species-identification labels are translated into Bisaya; stored values and matching remain unchanged. |
| Review and species names | Review uses larger, wrapping text, photo previews and editable sections. The heading is Species name; local name is followed by common and scientific names. |
| Status and totals | Every new report, including a follow-up, starts pending. Only independent staff verification contributes to verified totals. Needs attention refers to verified health concerns or unresolved follow-up requests. |
| Reports and Verification | Reports displays the archive. Verification contains staff decisions and follow-up controls. Experts cannot review their own observations. |
| Follow-up requests | Staff save an explicit flag and optional note. Guardians see Submit follow-up beside View and in details only when a request is available. Each follow-up is a new report with fresh photos and answers, its own review, and an explicit parent reference. |
| Observation history | Details show the original report and connected follow-ups in chronological order. Matching names, locations or species never create relationships. No automatic follow-up deadlines are added. |
| Account report numbering | Stored numbers start at 1 independently for each account. Transactions keep concurrent submissions unique. Global IDs and historical relationships remain intact. |
| Badges and certificates | Badge art/progress remains visible, and the certificate contains its public-verification QR code. |
| Navigation and readability | Mobile web uses bottom navigation; the APK keeps staff tools in the top menu without duplicating them in Account. Back returns to the previous report step and retains edits. Cancel confirms before discarding a draft. Dashboard status colors and larger form text are retained. |
| Homepage | Redundant expert/sign-in navigation and the floating example card are removed. Sign in appears in the hero. The process description now states that every report awaits expert review. |

## Main changed files

- `supabase/functions/api/core/service.js`, `follow-up.js`, `analytics.js`,
  `trait-images.js`, `images.js`, and `api.js`: persistence, status rules,
  relationships, photo validation, permissions, and image administration.
- `supabase/web/src/report-form.js`, `app.js`, `ui.js`, `admin.js`,
  `observations.css`, and `trait-labels.js`: web reporting, review, and choices.
- `app/Cloud/Router.php`, `app/Views/dashboard.php`, and `app/Views/home.php`:
  PHP routing, explicit follow-up requests, and accurate homepage wording.
- Flutter reporting/detail/list/verification screens, `follow_up_screen.dart`,
  `home_shell.dart`, `profile_screen.dart`, `analytics_screen.dart`, and API
  adapters: corresponding APK behavior and navigation.

## Database

No new SQL migration is required. The active Supabase backend stores optional
report fields and feature images in its existing JSON document store. No tables
or columns were renamed or removed, and no production data was deleted.
The previously applied report-number/site-ownership migration is documented in
`RELEASE_2_0_0_38.md`. The separate CPU recovery is documented in
`DATABASE_CPU_RECOVERY_2026_10_10.md`; its bounded transaction retries remain in
place.

## Validation

- 70 JavaScript unit/behavior tests passed.
- 71 HTTP integration checks passed against local PostgreSQL/PGlite, with
  explicit Auth and Storage test doubles. These cover permissions, site sharing,
  independent/concurrent numbering, unknown counts, verification, follow-ups,
  photo privacy, image administration, and certificates.
- 22 PHP packaging/session tests passed; PHP syntax checks passed.
- Supabase Edge type checks and its smoke test passed.
- Browser checks passed at 320, 390, 768 and 1440 pixels: 20 screen layouts,
  observation steps, image previews and site dialogs, with no horizontal
  overflow. Badge images loaded. Simulated desktop camera capture succeeded and
  released its video stream. Screenshots/results are in ignored
  `tmp/v39-workflow-review/`.
- Flutter analyzer passed; 89 tests passed with one existing optional skip,
  including Android Back/draft retention and APK analytics at enlarged text on
  a 320-pixel phone. `build-apk.ps1` successfully packaged the release; metadata is in
  `mobile/flutter_app/dist/ManGROOVES-Supabase.apk.json`.

The APK version is `2.0.0+40`, with SHA-256
`FDE84B7D8C9DD1ECB68CBA27B3449F677D4E65FD0B0652AFB6326C617412826B`.

Published and checked on October 10, 2026 at
`https://mangrooves-php.vercel.app`. Live homepage/news images and JS/CSS hashes
match the prepared package. Protected report, image and administration endpoints
reject unauthenticated access; website CORS is configured. The downloaded APK
matches the SHA-256 above. These live checks created no accounts or reports.

No physical phone was connected. Real camera permissions, GPS accuracy and APK
installation still require a device check.

## Outstanding supplied image

The exact CCENRO field-team photo requested for the middle homepage news card
could not be found. The user directed the audit to the project root; its newly
saved images are eight species reference posters and a separate poster, not the
field-team photograph. The original Facebook image URL returns 403. The existing
middle image remains accurately marked as illustrative while the exact filename
or original photograph is pending. The sample files themselves are preserved.
