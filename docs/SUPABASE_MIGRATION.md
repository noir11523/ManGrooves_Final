# ManGROOVES on Supabase Free

**PHP website published:** [mangrooves-php.vercel.app](https://mangrooves-php.vercel.app) runs the original PHP layout against this same Supabase project. Follow [VERCEL_PHP.md](VERCEL_PHP.md) to publish updates. GitHub is connected; unbuilt source pushes are skipped. Public PHP pages, assets, the Supabase connection, and upload CORS passed live checks. The older static Firebase-hosted site below remains available.

**Latest account-flow update, October 4, 2026:** the PHP website and APK **2.0.0+24** use **Account details → Verify email → Complete profile → Dashboard** for guardians. Completing registration signs in automatically. If that request fails, Continue to dashboard retries without creating another account. Both retain first/last names and entered details when going back, clear verification when the email changes, and wait one minute before resending. Profile fields are collected only after the six-digit code is verified. Expert applications use an ID code and need administrator approval. Sign-in has one show/hide password button per field, clear secondary actions, and buttons that fit narrow screens with larger text.

Release checks passed: 41 shared web/backend tests, 15 PHP/browser integration tests, Flutter analysis, and the full Flutter test suite, including registration through to the dashboard and sign-in retry. One optional legacy-LAN test was skipped. The unchanged API previously passed 51 workflow checks. The release APK is `mobile/flutter_app/dist/ManGROOVES-Supabase.apk` (55.7 MB); SHA-256: `E0659B77101D28CBF7C0CF9E6431025059E21E5080AC06B56213844C9F772B27`. A connected browser/physical phone was unavailable for live visual testing, and inbox-code entry remains unconfirmed.

The profile dropdown no longer offers Install app. **Download Android APK** in the public navigation and signed-in sidebar links directly to [the Android file](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk). Website packaging requires the current APK version and matching checksum.

This update is published. Live checks verified the PHP pages, dashboard-transition assets, upload CORS, and APK download headers. The full HTTPS APK download matched the release SHA-256 above.

The new website and Flutter client use Supabase Auth, PostgreSQL, private Storage, and Edge Functions. After deployment, the APK uses a fixed HTTPS address over mobile data or any Wi-Fi. Your laptop, Apache, MySQL, and local IP are not needed for normal use.

**Status on 2026-10-03: the database and Edge API are deployed.** Both clients point to `https://rsjwlhqzzvtakcbrzqgi.supabase.co`. The existing MySQL snapshot was imported: 18 accounts, 19 reports, 6 clusters, 11 review records, 7 earned badges, 40 notifications and 423 audit entries. Numeric IDs, roles, password hashes and report history were preserved. Photo preflight validated 14 distinct files. Missing packaged guide artwork was uploaded without replacing checklist settings.

**Website published on 2026-10-03:** [mangrooves-4236e.web.app](https://mangrooves-4236e.web.app). Firebase Hosting serves only the static website; Supabase handles accounts, reports, photos and the API. Both Hosting addresses are allowed by the API, and live file/CORS checks passed. No billing upgrade was made.

**Email sending retest passed:** after the user updated the Google app password, the live registration-code endpoint returned HTTP 200 and `ok: true` on 2026-10-03. Gmail SMTP and numeric-code templates are configured. Inbox receipt and code entry still need user confirmation; see [SMTP_SETUP.md](SMTP_SETUP.md). Existing imported accounts can sign in. The PHP/MySQL files remain available for rollback and do not synchronize with Supabase.

**Auth settings applied on 2026-10-03:** the Site URL is the published website, codes have six digits and expire after 600 seconds, and the password minimum is eight characters. Signup and email confirmation are enabled. These settings were applied separately from the blocked email templates and verified against the live project.

## Your next steps

1. Confirm that a registration code reaches your inbox using the configured SMTP settings. Keep email confirmation enabled.
2. Open [the current PHP website](https://mangrooves-php.vercel.app) and sign in with an existing account. XAMPP is not needed.
3. Install the new Supabase APK. Existing imported accounts retain their password and role. New guardians verify their email; new experts also need administrator approval.
4. Sign in as an existing administrator. Open **Certificate signer** and enter the authorized signer name/title. Upload an approved signature image if wanted.
5. Test a new registration, an expert application, and a password reset using a Gmail inbox; then submit a report using mobile data with XAMPP stopped.

Keep the private export in `supabase/migration-data` backed up. It contains password hashes and personal data and must never be published. The completed import must not be rerun with a different snapshot.

## Initial project setup

1. Open [Supabase](https://supabase.com/dashboard) and create a Free organization/project called **ManGROOVES**.
2. Choose a nearby region, such as Singapore. Save the database password privately.
3. Wait for the project to finish starting.
4. Open the project's **Connect** dialog or **Settings → API**. Find the **Project URL** and **publishable key**. Older projects may label the public key `anon`.
5. In VS Code, open **Terminal > New Terminal** in the project folder and run:

   ```powershell
   npm.cmd --prefix supabase ci
   npm.cmd --prefix supabase run configure
   ```

6. Paste the Project URL and **public publishable key** when asked. This saves matching settings in `supabase/client-config.json` and `mobile/flutter_app/supabase-config.json`. Both files are ignored by Git. It does not create, deploy, or change cloud resources.

If you already filled in a configuration file, use `npm.cmd --prefix supabase run configure -- --file supabase/client-config.json` to copy its validated public settings to Flutter. A different project requires the explicit `--replace-project` option.

Never put a database password, `sb_secret_...` key, or `service_role` key in these files, the website, Flutter, Git, or chat. Build scripts reject privileged keys.

## What runs where

| Part | Service/code |
| --- | --- |
| Website | Original PHP layout on Vercel, with shared JavaScript, Chart.js and Leaflet components; the earlier static Firebase site is retained separately |
| Mobile | Existing Flutter screens, `SupabaseApiClient`, HTTPS Auth/API requests |
| Sign-in | Supabase Auth; mobile refresh tokens stay in secure device storage |
| Data | PostgreSQL, versioned JSONB records in `app_documents` |
| Photos | Private `mangrooves` Storage bucket; API checks owner/staff access |
| Guide artwork | Public `mangrooves-reference` bucket containing packaged guides/badges only |
| Server rules | Deno Edge Function `api`, including scoring, review, analytics and administration |
| PDFs | `pdf-lib` on the server; no native binaries or paid rendering service |

The API URL is `https://YOUR_PROJECT_REF.supabase.co/functions/v1/api`. Familiar `.php` route names are kept for compatibility; no PHP server handles these routes. Both clients use this same API.

PostgreSQL stores flexible checklist/report snapshots as JSONB to preserve the existing response contract. An atomic SQL commit function checks document and collection revisions, then commits all changes together. This prevents lost edits, duplicate follow-ups, conflicting reviews and duplicate cluster creation. Direct client table/RPC access is denied; only the server's privileged client may use these functions. User metadata never determines app roles.

## Install and deploy the database/API

Run commands from the repository root in PowerShell. Use Node.js 22.22.2 or newer within the Node 22 line, or Node.js 24.15.0 or newer. Docker is not needed for these remote deployment commands.

```powershell
npm.cmd --prefix supabase ci
& .\supabase\node_modules\.bin\supabase.cmd login
& .\supabase\node_modules\.bin\supabase.cmd link --project-ref YOUR_PROJECT_REF
& .\supabase\node_modules\.bin\supabase.cmd db push
```

`link` may ask for the database password. Enter it privately in the terminal. Review the migration list before applying it. Use a fresh Supabase project; do not run the old MySQL `schema.sql` or `seed.sql` in PostgreSQL.

The migration creates the application tables, secure RPC functions, email protection, session revocation, and both Storage buckets. It does not import your old records or create demo accounts.

## Email codes and password recovery

The website and APK use three steps: **Account details → Verify email → Complete profile**. Step one collects first name, last name, email, matching passwords, and privacy consent. Continue sends the six-digit code. Only after verification do users choose Guardian or Expert, choose their barangay, and optionally add a phone number. A guardian profile is created at the final step. Experts enter a private work or professional **ID code**, not a photo; the account stays pending until an administrator approves it in **Expert applications**. Existing imported experts keep their existing access. An expert may submit reports but cannot review their own reports.

Forgot password sends a recovery code. The user enters it with a matching new password. Registration codes cannot reset passwords, and a used code cannot be reused. New passwords accept 8-25 characters. Changing a password revokes existing sessions. Email addresses remain locked.

### Configure email delivery privately

For a short walkthrough with exact Gmail pilot settings, see [SMTP_SETUP.md](SMTP_SETUP.md). It also shows how to apply the prepared code templates directly in the dashboard.

1. Choose an email service that provides SMTP. A free provider tier can be used; you do not need to upgrade Supabase for custom SMTP. Provider quotas and sender verification still apply.
2. In the [project dashboard](https://supabase.com/dashboard/project/rsjwlhqzzvtakcbrzqgi), open **Authentication > Email > SMTP settings** (sometimes shown as **Custom SMTP**).
3. Enter the provider's sender address/name, host, port, SMTP username and SMTP password. Save them there, not in Flutter, Git, a screenshot, or chat. Use the exact settings from your email provider.
4. Keep Email sign-in, new-user signup and email confirmation enabled. The app API controls application roles; Auth metadata cannot make someone an expert or administrator.
5. From the repository root, apply the saved code templates and security settings:

   ```powershell
   & .\supabase\node_modules\.bin\supabase.cmd config push --yes
   ```

6. In **Authentication > Email > Templates**, check **Confirm signup**, **Magic Link**, and **Reset Password**. They must display `{{ .Token }}`. The checked-in templates are `supabase/templates/confirmation.html` and `recovery.html`; code expiry is 10 minutes and length is 6 digits. Existing verified emails without an application profile use the Magic Link template with a code, so that template matters too.
7. Run a real registration and reset from the app or website. Check Inbox and Spam. A successful local test does not prove Gmail delivery.

Supabase's default mail service only sends to project-team addresses and has restrictive limits. On this Free project, the server rejected custom templates until SMTP is added. If `config push` still reports this, finish the SMTP setup first; do not pay for an upgrade just to bypass the message. See [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

Imported legacy accounts retain their sign-in access. Importing their email addresses is not proof that those users completed the new email-code flow.

The published website origins and local development origins are already allowed. To restore this setting (no trailing slash or path):

```powershell
& .\supabase\node_modules\.bin\supabase.cmd secrets set 'WEB_ORIGINS=https://mangrooves-4236e.web.app,https://mangrooves-4236e.firebaseapp.com,http://127.0.0.1:5002,http://localhost:5002' --project-ref rsjwlhqzzvtakcbrzqgi
```

Multiple allowed website origins can be comma-separated. Secret updates take effect without redeploying the function. Do not use a wildcard. Flutter does not need a CORS origin. `verify_jwt = false` in `config.toml` permits the public registration/configuration routes; protected API routes still validate Auth tokens, live sessions, active accounts, roles and ownership themselves.

## Fresh setup or import old data

Use **one** of the following paths before opening the service to users. Administrative commands use a secret key only on your computer. Find it in **Settings → API keys**, then set it privately for this terminal:

```powershell
$secureKey = Read-Host 'Supabase secret key (hidden)' -AsSecureString
$env:MANGROOVES_SUPABASE_SECRET_KEY = [Net.NetworkCredential]::new('', $secureKey).Password
```

Do not type the key as a literal command; shell history can retain it. Do not send it in chat. Clear it when you finish:

```powershell
Remove-Item Env:MANGROOVES_SUPABASE_SECRET_KEY
Remove-Variable secureKey
```

### A. Start without old users/reports

```powershell
node supabase/scripts/manage.js seed --project YOUR_PROJECT_REF
node supabase/scripts/manage.js seed --project YOUR_PROJECT_REF --apply
```

The first command previews the action. The second creates missing barangay/species/checklist/badge records and uploads packaged guide artwork. Existing settings are preserved. It creates no accounts or sample reports.

### B. Preserve the MySQL data

1. Back up MySQL and the photo folders.
2. Stop new submissions to the old installation during the final export/import. There is no ongoing synchronization.
3. Start MySQL temporarily. Apache is not required for the export.
4. Export, validate, then import into a fresh project with no Auth users or app activity:

```powershell
& C:\xampp\php\php.exe .\scripts\export-supabase.php
node supabase/scripts/import-mysql.js --file supabase/migration-data/YOUR_SNAPSHOT.json --validate-only
node supabase/scripts/import-mysql.js --file supabase/migration-data/YOUR_SNAPSHOT.json --project YOUR_PROJECT_REF
node supabase/scripts/import-mysql.js --file supabase/migration-data/YOUR_SNAPSHOT.json --project YOUR_PROJECT_REF --apply
node supabase/scripts/manage.js seed --project YOUR_PROJECT_REF --apply
```

The export is read-only and contains private account data/password hashes. Its directory is ignored by Git and blocked by Apache. Validation checks references and local photo files before any upload. The importer preserves numeric IDs, account roles, report history, checklist snapshots and supported bcrypt password hashes; Auth identities become deterministic UUIDs. Personal image metadata is removed during upload.

Import before running the seed command; the importer refuses existing reference settings too. The import locks the app while running. If interrupted, rerun the **same** snapshot to resume. It refuses a different snapshot, a populated target, and repeated completed imports. Do not remove its lock to bypass a failure. Supabase Auth password-hash acceptance and real photo uploads must be checked on your new project before retiring MySQL; local tests do not establish hosted migration success.

## Publish the website

The live site is **https://mangrooves-4236e.web.app**, also available at **https://mangrooves-4236e.firebaseapp.com**. Supabase hosts the backend; the existing Firebase Spark project serves the static files only. Firebase Functions, Firestore and Firebase Storage are not used.

To publish later website changes, run from the repository root:

```powershell
& .\firebase\node_modules\.bin\firebase.cmd deploy --only hosting --config firebase.supabase-hosting.json --project mangrooves-4236e --non-interactive
```

This command rebuilds the configured website before publishing only `supabase/web/dist`. On a new computer, first run `npm.cmd --prefix supabase ci`, `npm.cmd --prefix firebase ci`, configure the public Supabase settings, and sign in with `& .\firebase\node_modules\.bin\firebase.cmd login`. Always pass `--config firebase.supabase-hosting.json`; the old `firebase.json` belongs to the rollback Firebase backend.

Only upload the generated website directory, never the entire repository or `supabase/migration-data`. Cloudflare Pages Direct Upload remains an alternative: build with `npm.cmd --prefix supabase run build:web`, upload `supabase/web/dist`, then update the API origins to the new address.

The Supabase **Authentication > URL Configuration > Site URL** is already set to `https://mangrooves-4236e.web.app`. The checked-in `supabase/config.toml` includes this value. Applying the remaining email templates still requires the SMTP setup above.

This project already has imported administrator accounts. For a fresh project only, register the first account after email delivery is configured, then grant administrator access from your private terminal:

```powershell
node supabase/scripts/manage.js promote-admin --project YOUR_PROJECT_REF --email YOUR_EMAIL
node supabase/scripts/manage.js promote-admin --project YOUR_PROJECT_REF --email YOUR_EMAIL --apply
```

Sign in again. The administrator can manage other users' roles from the app. Bootstrap is audited and revokes old sessions.

## Check the live setup

After deploying the API and seeding or importing data, run:

```powershell
npm.cmd --prefix supabase run check:setup -- --origin https://mangrooves-4236e.web.app
```

This read-only check verifies matching client settings, the API identity, barangay data, the website origin, private-route protection, and guide artwork. Missing setup is reported as **NOT READY**. It does not replace signing in and submitting a real test report.

## Build the connected APK

Ensure `mobile/flutter_app/supabase-config.json` has the same public configuration as the website. Deploy and seed the API first.

```powershell
.\mobile\flutter_app\build-apk.cmd
```

Supabase is the default backend. The build script checks the live project identity and barangay list, runs Flutter analysis/tests, then builds `mobile/flutter_app/dist/ManGROOVES-Supabase.apk` with a SHA-256 file. It refuses missing configuration or privileged keys. Install this new APK; an old PHP/Firebase APK does not change providers automatically.

For rollback, the explicit `-Backend firebase` and `-Backend legacy` options remain. They use their own configuration/session storage. They do not synchronize data with Supabase.

## Verify before switching users

- Register with a wrong, expired, then valid email code on both clients. Check resend, Back, expert ID code approval/decline, and password recovery. Email stays locked; password changes sign out old sessions.
- Submit a photo/report using mobile data with Apache/MySQL stopped. Review/edit the summary, confirm submission, and open the saved photo.
- Healthy auto-verifies; Not Sure goes to review. An expert can correct health/species and see validation history.
- A guardian sees their own private reports/analytics. Other guardians cannot fetch their photos. Experts/admins see authorized aggregate data.
- Check address suggestions and manual pins, separate Health history/Growth timeline pages, notifications, checklist editing and admin PDF export. Reviewed reports must leave Needs attention.
- Configure the certificate signer. Download a certificate and scan the QR inside the PDF from another device. Confirm that the public verification page matches the recipient and badge, without exposing contact details or private reports.
- Confirm no secret key appears in `web/dist` or the Flutter configuration. Check Supabase usage and storage quotas.

Local checks available:

```powershell
npm.cmd --prefix supabase test
npm.cmd --prefix supabase run test:api
npm.cmd --prefix supabase run check:edge
npm.cmd --prefix supabase run test:edge
npm.cmd --prefix supabase run build:web -- --check
```

`test:api` uses real PostgreSQL running locally through PGlite and explicit test doubles for Auth/Storage. `test:edge` runs the HTTP/PDF/image code under Deno. `build:web -- --check` can build without a project for compilation checks; that output is deliberately unconfigured and must not be published.

## Expert ID code update on 2026-10-03

Expert applicants type their **Expert ID code** (work or professional ID number) in both the web and Flutter registration forms. No ID photo is needed for new applications. The code is required, trimmed, and limited to 80 characters. It is stored only in the private application record, not the user profile or audit details. Guardian registration does not request an ID code.

The email code verifies the email address. It does not approve expert access: an administrator must still review the ID code and approve the application. Admins can approve or decline in **Expert applications** on either client; declining needs a reason. Existing applications with ID photos retain their private admin-only photo viewer. No database reset or repeat data import is needed.

Install the latest APK from `mobile/flutter_app/dist/ManGROOVES-Supabase.apk` to use the updated expert signup form.

## Interface update on 2026-10-03

The published website and Flutter screens now use shorter location help and consistent **Review reports** / **Review history** labels. Each report has one status tag. Reviewed reports do not keep the Needs attention tag. The mobile review history now reads the cloud API's reviewer name and saved decision correctly.

The web report list has one status filter and a Clear filters action. The phone menu has a close button, backdrop, Escape support and keyboard focus handling. Extra coordinate details stay collapsed, and hidden form sections remain hidden. The Privacy page has a Back to home link that works when opened in a new tab. The app has clearer retry buttons and report cards that fit a 320-pixel screen with larger text. Analytics, Health history and Growth timeline keep their app menu positions.

Automated navigation, filter, report-editing and confirmation checks passed. A connected browser and physical phone were unavailable for visual/live-device verification. SMTP setup is still required for registration and password-reset emails.

## Previous inline email verification update on 2026-10-03 (replaced by the three-step flow)

The Vercel registration page and APK **2.0.0+22** reveal the email-code section directly below a valid email address. **Send code** needs only the email address; other account details can be completed afterward. **Verify email** checks the code, and the account button completes registration. Entering a different email clears its code and verification. Invalid or missing codes cannot create profiles. A one-minute resend pause and server rate limits remain in place.

The website and API are deployed. The three numeric-code email templates and Vercel Auth Site URL are applied. Gmail SMTP is configured, but a live send failed: the API returned HTTP 503 and Supabase Auth returned HTTP 500, `Error sending confirmation email`. Inbox delivery is not verified. The user confirmed that the SMTP password is a Google app password; the detailed Auth log error is still needed to diagnose the failure. See [SMTP_SETUP.md](SMTP_SETUP.md).

Validation: 38 shared web/backend tests, 50 API workflow checks, 13 PHP tests, Flutter analysis, and 65 Flutter tests passed; one optional legacy-LAN test was skipped. The published registration page and its inline-code assets were checked over HTTPS. APK: `mobile/flutter_app/dist/ManGROOVES-Supabase.apk` (55.6 MB), SHA-256 `B1B04E577DB5544D0F02C34B871668BB2373074A29F39FF3968F8B47632D029D`.

## Earlier registration and button update on 2026-10-03

The PHP website at **https://mangrooves-php.vercel.app/register.php** and Flutter registration now have separate show/hide password buttons, an 8–25 character length indicator, a clear privacy consent box, and **Create guardian account** / **Apply as expert** buttons. Wider screens place the passwords side by side; phones stack them. The consent checkbox starts unchecked. Email verification and administrator approval for experts still apply.

Buttons, form fields, filters and tables have more consistent spacing and larger tap targets. Flutter uses matching rounded buttons and clearer action labels. Existing app menu positions remain unchanged.

37 shared web/backend checks, 13 PHP deployment checks, Flutter analysis and 64 Flutter tests passed (one optional legacy-LAN check skipped). The published page and compiled assets were verified over HTTPS. A connected browser and physical phone were unavailable for visual verification. SMTP is still required to deliver registration and password-reset codes to real users.

The updated release APK is `mobile/flutter_app/dist/ManGROOVES-Supabase.apk`, version **2.0.0+21** (55.6 MB). It connects directly to the same Supabase project as the PHP website and uses the existing direct-install pilot signing certificate. SHA-256: `6416B178923E3EABBFF7A536BC64010585DFADCC0EC57336E3330D6F66143B68`.

## Earlier verified build on 2026-10-03

- PostgreSQL migrations and the Edge API are deployed to `rsjwlhqzzvtakcbrzqgi`.
- Live checks passed for sign-in, profile access, reference data, administrator restrictions, private photo downloads, Storage rules and direct table protection. The temporary test account/photo were removed; the 18 imported accounts and 19 reports remain.
- The temporary MySQL server used for export was shut down gracefully. The Supabase setup check passed again afterward.
- 36 backend/web unit checks and 48 API workflow checks passed after the expert ID-code update. Deno compilation and the HTTP runtime check passed. These cover ID privacy, code validation before email, pending approval, previous private photos, registration/recovery, report editing, review controls and navigation.
- Flutter analysis passed. The full suite passed 63 tests with one optional legacy-LAN test skipped.
- The configured Android release build is `mobile/flutter_app/dist/ManGROOVES-Supabase.apk`, version **2.0.0+20** (55.5 MB). It uses the direct-install pilot signing certificate; Play Store distribution still needs a private release signing key.
- SHA-256: `36999800B11584FC355126932D1ABB94B17C21565D9C36CB72E1CFAE9A5B9B90`.
- The website is published through `firebase.supabase-hosting.json`. Live HTML, JavaScript, CSS and public configuration match the local build on both Hosting addresses. The live API rejects a missing expert ID code before account creation or email delivery. Browser API preflight and protected-route checks passed; unrelated website origins are not allowed. No browser was available for a visual check of the published site.
- The website upload package is `dist/ManGROOVES-Supabase-Web.zip`; it remains available for an alternative static host.
- Certificate PDF layout was rendered and inspected; the downloaded file has no QR. Real Gmail delivery and testing on a physical phone still need to be completed after SMTP setup.

## Interface and certificate notes

- **Analytics**, **Health history**, and **Growth timeline** keep their existing app menu positions. Guardians see personal analytics; staff see aggregate data.
- Health history charts verified health categories. Growth timeline charts the number of living mangroves counted per visit. These counts do not measure tree height; differences can reflect a different area surveyed.
- Report labels use `Report #123`. The old stored IDs remain available for migration/audit history. Needs attention means a pending report; saving a review removes that tag.
- Address suggestions use Photon/OpenStreetMap through the API. Choosing an address places a manual pin; the normal site-boundary checks still apply. If search is unavailable, users can tap the map. The public Photon service has no uptime guarantee; `GEOCODING_URL` can point to a compatible HTTPS service later.
- Administrators set the certificate signer name/title and may upload an authorized PNG/JPG signature in **Certificate signer** on either client. The server will not invent a signer. Until one is configured, certificate downloads explain what is missing.
- Certificate PDFs contain a locally generated QR code inside the certificate. Scanning it opens a public verification page with the recipient, badge, award date, and certificate code. It does not expose contact details or reports. Existing temporary download links still expire after 10 minutes; printed verification codes do not expire with those links.
- Expert IDs and report photos use private Storage. Only administrators can retrieve application ID images. Guardians cannot retrieve another user's report photos.

## Free plan limits

Supabase Free currently includes 500 MB database storage, 1 GB file storage, and limited transfer/function usage. Free projects can pause after a week of inactivity. These limits suit a pilot; they do not guarantee unlimited, always-on production service. Photos are capped at 5 MB each and 8 MB per checklist save. The Edge API validates raster containers and strips personal metadata without native Sharp; it preserves image size and orientation rather than doing expensive server-side resampling.

Official references: [Supabase pricing](https://supabase.com/pricing), [Edge limits](https://supabase.com/docs/guides/functions/limits), [Auth email delivery](https://supabase.com/docs/guides/auth/auth-smtp), [Function authorization](https://supabase.com/docs/guides/functions/auth), [Cloudflare Pages direct upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
