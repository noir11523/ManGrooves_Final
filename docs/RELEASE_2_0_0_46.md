# ManGROOVES 2.0.0+46

## Layout and usability

- Web filters use compact fields rather than stretching short inputs across the page. On phones, search fills one row and the remaining fields wrap with readable text and touch targets.
- Report details and review steps have a comfortable maximum width. The living-mangrove count stays short on desktop, and photo cards use less padding. The observation step retains its large circular pictures and tap-to-preview behavior.
- Continue and Submit have larger, 52-pixel minimum-height buttons. Back remains beside the primary action. Admin save actions also have larger targets.
- Profile and password cards align at the top without forcing the shorter card to match the other's height. Admin editors have room for their fields; applicant messages use a readable width.
- The APK limits wide report and account forms on tablets while retaining the full available width on phones. Observation choices can use a wider area.
- Flutter primary buttons retain a 52-pixel minimum height without requiring infinite width in compact action rows.

## Password controls

- Profile password changes now have independent Show/Hide eye buttons for Current password, New password, and Confirm password on web and APK, matching the existing registration and recovery controls.
- Eye buttons preserve entered text and do not submit the form. Web validation shows mismatched or unchanged passwords before opening the confirmation dialog.

## Validation

- 87 Node/web tests passed.
- 77 API integration checks passed with local PostgreSQL/PGlite and explicit Auth, Storage, and mail test doubles.
- Flutter analysis passed; 98 Flutter tests passed, with one existing optional test skipped.
- Browser checks covered 48 page/viewport combinations at widths of 320, 390, 768, and 1440 pixels, with no horizontal overflow or JavaScript errors. Pages included reporting, report details, profile, verification, analytics, and administration. Additional checks covered map dialogs, photo actions using a simulated camera, and observation previews.
- Responsive Flutter tests covered widths of 320 and 1024 pixels at normal and doubled text size, including compact action rows, bounded fields, and usable primary buttons.
- No schema migration or data deletion is required. Reporting rules, review permissions, and saved data are unchanged by this layout release.

## Remaining external checks

Physical Android camera/GPS behavior and actual email inbox delivery were not retested on a device or inbox. Expert decision email still requires the existing registration sender's SMTP credentials to be configured for the Edge Function; see [email setup](EXPERT_DECISION_EMAIL.md). Applicant reasons remain saved and visible after sign-in.

Website: https://mangrooves-php.vercel.app

APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk

## Published verification — October 15, 2026

- Website and Edge API published successfully. Public pages render, and the live homepage images and JavaScript/CSS hashes match the prepared release.
- Protected API endpoints returned 401 without authentication. Photo-upload CORS allows the published website origin.
- Deployment: https://mangrooves-e4xt3jmm1-clements-projects-5174d0c3.vercel.app
- APK version: `2.0.0+46`; size: 59,762,000 bytes. Remote HEAD content length, content type, attachment disposition, and ETag match the local APK. Its local SHA-256 matches the release metadata and the published checksum file.
- APK SHA-256: `750536EEB90A5577DA23C591FD61A068457EFDA570C80DBBBEE901269964AFD7`.
- Source files remain in the working tree; no source commit or Git push was performed for this release.
