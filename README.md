> **Live PHP website: [ManGROOVES on Vercel](https://mangrooves-php.vercel.app).** The original PHP layout uses the same Supabase project as the APK. GitHub is connected; publish prepared updates with the [Vercel PHP guide](docs/VERCEL_PHP.md). The [older static website](https://mangrooves-4236e.web.app) remains available. Gmail SMTP and code templates are configured, and the live send request passed; [inbox verification](docs/SMTP_SETUP.md) is pending. The Firebase backend sections below are rollback documentation.

# ManGROOVES

**[Download the Android APK](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk).** Open the link on your Android phone to download the app. The website and APK use the same Supabase accounts and data. Verified guardians go directly to their dashboard after finishing registration; expert applications still need admin approval.

Unfinished reports save on the current device, including the photo, checklist and current step. Location-name suggestions select a pin that continues into the map step. See the [draft and location notes](docs/VERCEL_PHP.md#report-drafts-and-locations) for recovery behavior and GPS limitations.

ManGROOVES is a responsive community mangrove monitoring and environmental decision-support application for the CCENRO pilot site in Barangay Inayawan, Cebu City.

## Cloud setup

### Run the same website locally

From this project folder, run `scripts\start.cmd`, then open **http://127.0.0.1:8086**. The launcher rebuilds the PHP website from the same source used for Vercel and connects to the same Supabase accounts and data. Apache and MySQL are not needed. Keep the terminal open; press Ctrl+C to stop. See the [local setup guide](docs/VERCEL_PHP.md#local-preview) for first-time tool installation and APK preparation. The old XAMPP `/mangrooves_v2/public` address is the legacy MySQL site; use port 8086 for the current Supabase version.

New Flutter builds use Supabase by default. The website and mobile app share Supabase Auth, PostgreSQL, private photo storage, and the hosted Edge API. After deployment, they work over mobile data or any Wi-Fi without a laptop server or changing IP addresses.

Follow [Supabase setup, data migration, deployment, and APK build](docs/SUPABASE_MIGRATION.md). The existing 18 accounts and 19 reports were imported on 2026-10-03. The Firebase source and [rollback guide](docs/FIREBASE_MIGRATION.md) remain available. The PHP/MySQL instructions below apply to the legacy installation. Supabase PDFs use pdf-lib; the legacy installation uses FPDF.

The Supabase clients include email-code registration and password recovery, private expert ID code applications with administrator approval, and report submission for approved experts. Registration has three steps: account details, six-digit email verification, and profile details. Back preserves entered details; changing the email requires a new code. The live email-code send request passed after the SMTP password update; inbox receipt and code entry still need confirmation. Health history and Growth timeline now open separately. Certificates use an administrator-selected signer with a temporary download QR beside the certificate; no QR appears inside the PDF.

It includes guardian field reporting, GPS/manual map location, private photo evidence, illustrated health observations, ranked species suggestions, expert verification and feedback, automatic clusters, follow-up timelines, notifications, badges and printable certificates, interactive maps, analytics, printable official reports, user/species/badge administration, and audit logs.

New Healthy reports are automatically verified on web and Flutter submissions. Stressed, At Risk, and Unknown reports remain pending for expert/admin review. Multi-answer checklist groups support “None of the above” and “All of the above” as exclusive answers. For an existing database, run `C:\xampp\php\php.exe scripts\migrate-report-choices.php` once to add these choices without reloading demo data or modifying existing reports. Fresh installs include them in both reference and seed data.

Staff notifications include pending reports and sites needing attention, with separate read state for each expert/admin. Web and Flutter registration/profile use first and last names; legacy users confirm their name parts without guessing. Newly set passwords accept 8–25 characters without mandatory symbol/case rules (existing passwords still work at sign-in). System administrators can download analytics PDFs on the web or save/share them from Flutter. PDF generation uses the bundled [FPDF 1.9](https://www.fpdf.org/) library; its license is in `app/Libraries/fpdf/license.txt`.

Both report forms use the same barangay/cluster coordinates. Selected clusters must match the report location within their radius plus measured GPS uncertainty. Flutter automatically captures GPS on the report tab when permission was already granted. The location map displays device accuracy circles; approximate readings only guide manual placement and are never silently stored as exact pins.

Web and Flutter reports now use Site, Health, Details, and Review steps. The review shows the latest photo and answers with Edit buttons; the final confirmation sends the report. Follow-up fields appear only when linking a previous report. Dashboard totals open matching report lists, and the cluster health map appears below Latest reports for guardians, experts, and administrators. Flutter includes status filters, report pagination, and Back controls.

The Report map opens from the Dashboard on web and Flutter. Find a location suggests addresses and landmarks; selecting one centers a blue pin without changing report coordinates. Report health/status filters and the app's report pagination remain available. Guardians see their own reports; staff can inspect all reports. The web Clusters menu opens on hover, click, or keyboard, with Analytics, Health history, and Growth timeline links. Flutter offers the same destinations in Analytics and timelines and cluster marker menus. Timelines contain verified visits and observed living-mangrove counts; other guardians' photos, coordinates, and feedback stay private. Staff can browse Validation history, including automatic Healthy verification, and inspect before/after health and species decisions. Flutter previews use the server classifier and show each of the three scored answers. Incomplete or tied species trait matches remain unresolved.

Administrators can add or delete choices, rename every choice (including automatic choices), and edit questions, points, and guide/choice photos under **Health checklist** (web sidebar or app Account). The server applies the same settings to web and Flutter. Each health criterion keeps a 0-2 point range, for a maximum of 6; saved report scores and answer snapshots do not change. Unknown answers are unscored and require review. None of the above adds 0 to optional groups; All of the above uses the lowest score (0) for a health check and totals regular choices in context and environmental groups. Leaf Condition and Bark/Trunk now include All of the above. Deleting hides choices from new reports; past answers remain intact. Undo is available before saving, and automatic answer types can be added again. Not Sure is excluded from aggregates.

Existing installations need `C:\xampp\php\php.exe scripts\migrate-checklist.php` before using this version. This additive migration preserves reports. Uploaded checklist pictures are stored in `public/assets/img/checklist/`; include that directory with site backups and hosting transfers. Reference imports preserve administrator checklist edits.

## Legacy PHP/MySQL quick start

1. Open XAMPP Control Panel and make sure MySQL is running. Apache is optional when using the included PHP development server.
2. Open PowerShell in `C:\mangrooves_v2`.
3. Initialize a fresh development database with demo data:

   ```powershell
   .\scripts\install.cmd
   ```

4. Start the application:

   ```powershell
   .\scripts\start.cmd -Backend legacy
   ```

5. Open <http://127.0.0.1:8085> (or consistently use `localhost`).

The included `.env` matches this computer's XAMPP MariaDB port (`4306`). The installer and backup scripts read database settings from `.env`; update `DB_PORT` there for a normal XAMPP installation using `3306`. Keeping local `APP_URL` empty preserves whichever host you chose. Production must set one canonical HTTPS URL.

The default installer imports development accounts and activity. Use it only for a fresh or disposable development database, and never rerun it over real data.

## Development accounts

All seeded accounts use the password `Mangrooves123!`.

| Role | Email |
|---|---|
| Coastal Guardian | `guardian@test.com` |
| Scientific Expert | `expert@test.com` |
| System Administrator | `admin@test.com` |
| Additional Guardians | `guardian2@test.com`, `guardian3@test.com` |

These are development fixtures. Never initialize production with the demo seed.

## Production-safe initialization

After configuring `.env` for an empty production database, import only the schema and approved reference records, create the first administrator interactively, and run the full health check:

```powershell
.\scripts\install.cmd -ReferenceOnly
.\scripts\create-admin.cmd
& 'C:\xampp\php\php.exe' .\scripts\healthcheck.php
```

`-ReferenceOnly` uses `database/reference.sql`; it creates no demo users, reports, clusters, notifications, or activity. See the deployment guide before exposing the application.

## Important commands

```powershell
# PHP extensions, writable storage, reference data, administrator, and integrity checks
& 'C:\xampp\php\php.exe' .\scripts\healthcheck.php

# Automated test suite
& 'C:\xampp\php\php.exe' .\tests\run.php

# Isolated full browserless release journey (creates and removes its own database/server)
& 'C:\xampp\php\php.exe' .\tests\e2e_release.php

# Re-evaluate active guardians for configured badges (schedule daily in production)
& 'C:\xampp\php\php.exe' .\scripts\evaluate-badges.php

# Refresh all-time static analytics charts with the configured Python runtime
python .\analytics\generate_charts.py

# Timestamped database backup
.\scripts\backup.cmd

# Build and test the proper Flutter Android client
.\mobile\flutter_app\build-apk.cmd -ApiBaseUrl "http://YOUR-PC-IP/mangrooves_v2/public/mobile-api"
```

Automated database and HTTP tests are for disposable development/test environments only; see `docs/TESTING.md` before running them.

## Documentation

- [Setup guide](docs/SETUP.md)
- [User guide](docs/USER_GUIDE.md)
- [Technical guide](docs/TECHNICAL_GUIDE.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Online access for classmates; hosting and online APK](docs/ONLINE_HOSTING.md)
- [Data and scoring decisions](docs/DATA_AND_SCORING.md)
- [Generated image assets](docs/IMAGE_ASSETS.md)
- [Testing guide](docs/TESTING.md)
- [Appendix H module verification](docs/APPENDIX_H_VERIFICATION.md)
- [Mobile release verification](docs/MOBILE_RELEASE_VERIFICATION.md)
- [Flutter Android and iPhone installation](docs/MOBILE_INSTALLATION.md)

## Technology

- PHP 8.2 with PDO and prepared statements
- MariaDB/MySQL with InnoDB
- Bootstrap 5, custom responsive CSS, Leaflet/OpenStreetMap, and Chart.js
- Browser Geolocation API and camera/file capture
- Native Flutter client for Android and iOS using secure PHP JSON APIs
- Installable progressive web app as a fallback
- Optional Python/pandas/matplotlib static analytics generation
