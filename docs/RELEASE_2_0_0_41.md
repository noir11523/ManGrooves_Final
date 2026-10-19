# ManGROOVES 2.0.0+41 report usability and reliability

This release updates the report flow on the Supabase-backed website and Flutter
APK. The earlier feature audit is in [release 40](RELEASE_2_0_0_40.md); the changes
below replace its enlarged-choice preview behavior.

## Report interface

- A compact **+ Photo** button replaces the large additional-photo panel. Camera
  and Gallery appear only after opening it. Selected extras have small previews
  and remove controls. The four-extra-photo and 12 MB combined limits remain.
- **Unable to count** is a large, clickable checkbox row. Its guidance appears
  only when checked: **Choose a saved site. Count will be unknown.** With a site
  selected, the message becomes **Count saved as unknown.** Unknown is still
  stored as null, never as zero.
- Step 3 retains the **Observations** name, with large responsive image tiles,
  20-pixel choice labels and a clear selected state. Tapping a tile selects it
  immediately. The separate question guide image and Enlarge dialog are removed.
  Multi-select, exclusive answers, species traits and admin-editable choice images
  retain their existing behavior.

## Duplicate photos and report reliability

- Both clients check actual file contents when choosing overview, close-up and
  additional photos. Renaming a copied photo cannot bypass the check. A rejected
  replacement leaves the previous valid selection intact.
- Photo checks run again before advancing/submitting, including restored drafts.
  Repeated submit taps cannot open overlapping confirmation dialogs in the APK.
- Server integration checks cover duplicate photos within a report, reused photos
  across accounts and slots, and metadata-only JPEG changes. The existing server
  checks and transactional photo claims remain authoritative. A network retry of
  the same submission remains idempotent.
- These checks identify copied image content; they do not promise visual
  similarity detection for arbitrary crops, resizing or re-encoding.
- Follow-up retries preserve the exact original request. An unavailable site or
  request blocks submission instead of silently becoming a different report.
  A follow-up pin cannot leave its requested site.
- Desktop camera capture releases its video stream immediately after copying
  the frame, before JPEG encoding finishes. Cancellation and encoding failures
  clean up the camera as well.

## Verification

Main implementation files: `supabase/web/src/report-form.js`,
`report-photos.js`, `observations.css`, `camera.js`, and Flutter's
`lib/screens/submit_report_screen.dart` and `lib/core/report_photos.dart`.
Matching web, API and Flutter regression tests accompany these changes.

- 79 JavaScript tests passed, including form events, renamed-photo rejection,
  conditional count guidance, one-tap choices and camera cleanup.
- 73 API integration checks passed in an isolated test database.
- Browser checks passed at 320, 390, 768 and 1440 pixels: 20 page layouts, report
  steps, large choices, conditional photo controls, site dialogs and simulated
  desktop camera capture. No horizontal page overflow or console errors were
  found. Screenshots and results are in ignored `tmp/v41-workflow-review/`.
- Flutter analyzer completed without issues. All 93 Flutter tests passed with
  one existing optional skip, including Back, restoration, retry, duplicate
  selection and direct choice selection. Photo tests await real file loading
  rather than relying on a fixed delay.

No database migration or production data deletion is required. Real phone
camera permissions, GPS and installation still need a physical-device check.
The exact outstanding CCENRO field-team homepage photograph is unchanged; see
the release 40 audit for the missing asset details.

## Release package

`build-apk.ps1 -SkipClean` completed the required analyzer, complete Flutter
test suite and Android release build. The package is
`mobile/flutter_app/dist/ManGROOVES-Supabase.apk`, version `2.0.0+41`, SHA-256:

`9E0CC7DDE9AE0BC8C4A7B872B1823844EEB7075E9E741FC25D41A267A9BED168`

`node vercel/build.mjs` prepared the matching PHP website and verified the APK
version and hash before including the download.

Published on October 11, 2026 (Asia/Manila) to
`https://mangrooves-php.vercel.app`. Read-only live checks confirmed:

- Homepage/news assets and JavaScript/CSS hashes match the prepared package.
- Protected report, image and administration endpoints require authentication.
- The website origin is allowed for API requests and photo uploads.
- The downloaded APK is `2.0.0+41`, 59,729,232 bytes, and matches the SHA-256 above.

The live checks did not create accounts, submit reports or delete data. Source
changes remain in the local workspace; this update did not push a new Git commit.
