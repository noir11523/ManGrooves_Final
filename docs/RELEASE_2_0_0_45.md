# ManGROOVES 2.0.0+45

## Expert application decisions

- Decline requires a message to the applicant. The web form and APK clearly identify that message; the APK keeps its dialog open when the reason is missing.
- An applicant who signs in after rejection sees the saved reason. Historical saved reasons also work. The applicant still cannot access restricted account features.
- Approval and decline can notify the applicant through the same verified SMTP service used for registration. Delivery state and Retry email are available to administrators. Mail failures do not undo the decision. No bulk notices are sent to historical applicants.
- **Email setup remains required:** this project's Edge Function has no SMTP sender secrets. The adapter is tested, but real delivery is not verified. See [sender setup](EXPERT_DECISION_EMAIL.md).

## Requested Inayawan sites

- Sitio Bagong Silang Mangrove Forest
- Inayawan Sanitary Landfill Shoreline
- Bulacao River Mouth / Boundary Swamp

These are site names, not additional barangays. They are prepared under Inayawan as inactive **Needs pin** drafts. The boundary description must be confirmed when pinning. In Species and Sites, an administrator or expert selects **Set pin**, checks the location, and saves to make the site available.

Drafts have no invented coordinates and are excluded from report choices, dashboard maps, and analytics. Historical claims and tree counts from the supplied image were not inserted as verified observations. The import is idempotent and leaves existing sites intact. No schema migration or data deletion is required.

## Validation

- 84 existing Node/web tests plus 2 new email-state tests passed.
- 77 API integration checks passed using local PostgreSQL/PGlite and explicit Auth, Storage, and mail test doubles.
- Flutter analyzer passed; 94 Flutter tests passed, with one existing optional test skipped.
- Eight browser layouts passed without overflow or JavaScript errors. Checked missing-reason validation and setting a pin on a draft site.
- SMTP inbox delivery cannot be tested until the existing sender credentials are configured.

Website: https://mangrooves-php.vercel.app

APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk

## Published verification — October 13, 2026

- Website and Edge API published successfully; public pages, asset hashes, protected endpoints, and CORS checked live.
- Deployment: https://mangrooves-i1ese0749-clements-projects-5174d0c3.vercel.app
- The three site drafts were inserted and read back successfully with null coordinates, inactive status, and zero verified observations. A repeated preview found no missing entries or duplicates.
- APK: 59,745,616 bytes; remote HEAD length and ETag match the local release. SHA-256: `B3D53642536BA38A6C8C5514AEFAA49AE56A1C48777DD8C8E21BAE86251FEF30`.
- Email credentials remain unconfigured; real delivery was not attempted. No historical applicant emails were sent.

## Password-reset web update — verified October 14, 2026

- New password and Confirm password now have independent eye buttons matching registration. They preserve entered values and do not submit the form. Accessible labels switch between Show and Hide.
- Hidden password inputs stay disabled until a reset code is requested, so browser validation does not block the initial email step.
- The existing APK already has these controls; its behavior was retested and version 2.0.0+45 is unchanged.
- Checks passed: 86 Node/web tests, 77 API integration checks, 94 Flutter tests (one existing optional skip), and Flutter analysis. The recovery tests cover both eye buttons, invalid codes, password confirmation, and returning to sign-in after reset. Four browser viewport checks passed without overflow or JavaScript errors.
- Updated website deployment: https://mangrooves-fsfuj146b-clements-projects-5174d0c3.vercel.app
- Tests use test doubles for email delivery; actual inbox delivery was not retested.
