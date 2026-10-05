# ManGROOVES on Firebase (rollback reference)

**The original PHP website is live on Vercel:** [mangrooves-php.vercel.app](https://mangrooves-php.vercel.app). Follow [VERCEL_PHP.md](VERCEL_PHP.md) for updates. The website and APK share Supabase.

**Setting up email codes?** Open [SMTP_SETUP.md](SMTP_SETUP.md). Email delivery is configured in Supabase for both the current website and APK.

**Current setup: Supabase Free with the PHP website on Vercel.** The earlier static website remains at [mangrooves-4236e.web.app](https://mangrooves-4236e.web.app); current web updates are published at [mangrooves-php.vercel.app](https://mangrooves-php.vercel.app). Follow [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) for the shared backend and [VERCEL_PHP.md](VERCEL_PHP.md) for publishing. This guide's Firebase backend is retained for rollback; its Functions/Storage deployment requires billing and is not the selected setup. Do not use the commands below to update the current website.

The Firebase version connects over a stable HTTPS address. Once it is deployed and the Firebase APK is installed, users can use mobile data or any Wi-Fi. Your laptop, Apache, MySQL, and local server IP are not part of normal operation.

**Current state:** Firebase source code and local emulator tests are available. The local project alias points to `mangrooves-4236e`, and Flutter's ignored `firebase-config.json` contains its public client configuration. The supplied Web app ID is `1:607732933183:web:2b3f1628551bded8ab8e8a`, and its configured bucket name is `mangrooves-4236e.firebasestorage.app`.

Firebase CLI sign-in and access to this project were verified on 2026-10-02. Read-only checks found that Authentication has no project configuration yet, and the Firestore and Firebase Storage APIs are disabled or have not been used. Billing could not be checked because the Cloud Billing API is also disabled; this does not establish the project's billing plan. Finish the console setup below before deployment. No existing data has been uploaded, and a connected production APK cannot be produced until the project is configured and deployed. The original PHP/MySQL implementation is kept for migration and rollback.

## What runs where

| Part | Firebase version |
| --- | --- |
| Website | Responsive JavaScript app in `firebase/web`, deployed to Firebase Hosting |
| Android/iOS | Existing Flutter screens, using `FirebaseApiClient` by default |
| Sign-in | Firebase Authentication; the browser uses the Firebase JS SDK and Flutter uses the documented Auth REST API |
| Data | Cloud Firestore, accessed through the hosted API |
| Photos | Cloud Storage; private report photos require owner/staff authorization |
| Business rules | Node.js 22 Cloud Functions, in `asia-southeast1` |
| Charts/PDFs | Chart.js on web, fl_chart on Flutter, PDFKit on the server |
| Maps/GPS | Leaflet on web, flutter_map/geolocator on mobile, OpenStreetMap tiles |

Both clients use `/mobile-api/*` on your Firebase Hosting domain. The familiar `.php` route names are retained for the mobile response contract; they are handled by Node.js and **do not run PHP**.

Firestore and Storage rules deny direct client access. The API verifies Firebase ID tokens, checks that the account is active, and applies its role/ownership permissions. Guardians receive personal analytics; experts/admins receive aggregate analytics. Survival and PDF export remain administrator-only.

The six-point health model, unknown-answer review, automatic Healthy verification, editable checklist, answer snapshots, cluster matching, follow-ups, history, notifications, badges, and certificates are implemented in the cloud API. Firestore transactions prevent duplicate active follow-ups, conflicting reviews, and duplicate cluster creation. Repeated identical submissions reuse the saved report; reusing a photo with changed report data is rejected.

## 1. Create your project

1. Open [Firebase Console](https://console.firebase.google.com/) and create a project for ManGROOVES. Save its **project ID**.
2. Enable the **Blaze** billing plan for Functions and Storage. Review Firebase pricing and set a budget alert before deploying. No billing changes are performed by the repository scripts.
3. In **Authentication → Sign-in method**, enable **Email/Password**. Configure the password policy to require 8–25 characters, with the extra uppercase/lowercase/number/symbol requirements off, matching this app.
4. Create the **Cloud Firestore default database**, using production rules. Choose a location near your users; this implementation uses Singapore (`asia-southeast1`) for Functions.
5. Create the default **Storage** bucket. Record its exact name (new buckets generally end in `.firebasestorage.app`).
6. Register a **Web app** in Project settings and link it to the default Hosting site. Copy the Web API key for the mobile configuration. A web API key identifies the Firebase project; it is not an administrator credential.

Do not send service-account keys, account passwords, or billing details in chat or commit them to Git.

## 2. Install local tools

Use Node.js 22 for production parity. Java 21 is needed only for the local emulators. From the repository root:

```powershell
npm.cmd --prefix firebase ci
npm.cmd --prefix firebase/functions ci
& .\firebase\node_modules\.bin\firebase.cmd login
```

For administrative seed/import commands, use **Application Default Credentials** for the target project. Firebase CLI login alone does not provide Admin SDK credentials. You can use `gcloud auth application-default login` if Google Cloud CLI is installed, or set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file kept outside the repository and web root. Use a project administrator account only for the migration/bootstrap tools; the deployed runtime should have only the roles it needs.

## 3. Choose fresh setup OR import

### A. Fresh setup, without old accounts/reports

Create only the reference barangay, species, checklist, and badge definitions:

```powershell
node firebase/functions/scripts/seed.js --project YOUR_PROJECT_ID
node firebase/functions/scripts/seed.js --project YOUR_PROJECT_ID --apply
```

The first command is a dry run. The second creates missing reference documents and preserves existing definitions. Deploy the website, register your own account, then grant it the administrator role:

```powershell
node firebase/functions/scripts/promote-admin.js --project YOUR_PROJECT_ID --email YOUR_EMAIL
node firebase/functions/scripts/promote-admin.js --project YOUR_PROJECT_ID --email YOUR_EMAIL --apply
```

Sign in again after promotion. Public registration always creates a guardian; it cannot request administrator access.

### B. Preserve existing MySQL data

Use a fresh Firebase project with no Authentication accounts or activity. Do not seed it first if the SQL database has customized reference data. The importer refuses to overwrite an existing live dataset.

1. Back up the existing database and upload folders.
2. Stop new submissions to the legacy installation during the final export/import. It does not synchronize later SQL changes.
3. Start MySQL temporarily. Apache is not needed for the CLI export. The export reads a consistent snapshot and does not modify MySQL.

```powershell
& 'C:\xampp\php\php.exe' .\scripts\export-firebase.php
```

The command prints the filename under `firebase/migration-data/`. That directory is ignored by Git and blocked by Apache. The snapshot contains private records and password hashes; keep it private.

4. Validate locally before connecting to Firebase:

```powershell
node firebase/functions/scripts/import-mysql.js --file firebase/migration-data/YOUR_SNAPSHOT.json --validate-only
```

5. Preview the target, then import:

```powershell
node firebase/functions/scripts/import-mysql.js --project YOUR_PROJECT_ID --bucket YOUR_BUCKET_NAME --file firebase/migration-data/YOUR_SNAPSHOT.json
node firebase/functions/scripts/import-mysql.js --project YOUR_PROJECT_ID --bucket YOUR_BUCKET_NAME --file firebase/migration-data/YOUR_SNAPSHOT.json --apply
```

The importer preserves numeric IDs, roles, follow-ups, review/audit logs, original answer snapshots, badge awards, and compatible bcrypt password hashes. SQL users receive stable Firebase UIDs such as `legacy-12`. Old PHP sessions and mobile bearer tokens are not copied; users sign in again with their existing passwords.

Missing photos, broken references, unsupported password hashes, or unsupported source time zones stop preflight. Do not skip these errors. A running migration locks the API; an interrupted import can resume using the **same snapshot**. A completed import is not reapplied. The importer checks collection counts before unlocking access. Do not manually remove the migration lock to bypass a failure.

After importing, test a guardian, expert, and administrator account before allowing new submissions or distributing the APK. Retain the SQL backup until the cloud data is accepted. Once users submit in Firebase, switching back to MySQL requires an explicit reconciliation/export; the old database does not receive cloud changes automatically.

## 4. Deploy the online version

From the repository root:

```powershell
npm.cmd --prefix firebase/functions test
& .\firebase\node_modules\.bin\firebase.cmd deploy --project YOUR_PROJECT_ID --only firestore,storage,functions,hosting
```

Hosting's predeploy hook always rebuilds the **production** website, so an emulator build cannot be accidentally published. Do not run `firebase init` over the supplied configuration unless you review the changes it makes.

If a new project's runtime service account lacks permissions, configure the function runtime account with Cloud Datastore User, Firebase Authentication Admin, and the necessary Storage object permissions on this application's bucket. Read the actual denied permission in the Functions log; do not make the database/bucket public to work around it.

Check this address in a browser:

```text
https://YOUR_PROJECT_ID.web.app/mobile-api/configuration.php
```

It must return `ok: true`, `backend: "firebase"`, the correct `project_id`, and at least one barangay. Then test sign-in, a report with a photo, expert review, checklist photo edits, and an administrator PDF. The public website is `https://YOUR_PROJECT_ID.web.app`.

For a custom web domain, add it to Firebase Authentication's authorized domains. If that website calls the API across origins, set `WEB_ORIGINS` for Functions to the exact allowed HTTPS origins, comma-separated. The default same-origin Hosting setup needs no extra CORS settings.

## 5. Build the Firebase APK

Copy `mobile/flutter_app/firebase-config.example.json` to `mobile/flutter_app/firebase-config.json`, then replace the placeholder values:

```json
{
  "BACKEND": "firebase",
  "FIREBASE_PROJECT_ID": "your-real-project-id",
  "FIREBASE_API_KEY": "your-project-web-api-key"
}
```

The real configuration file is ignored by Git. It contains public Firebase client configuration, not a service-account key. Never put an Admin SDK private key inside an APK.

```powershell
.\mobile\flutter_app\build-apk.cmd -FirebaseConfig .\mobile\flutter_app\firebase-config.json
```

The script verifies the deployed API/project, runs analysis/tests, and creates:

```text
mobile/flutter_app/dist/ManGROOVES-Firebase.apk
```

Missing configuration, demo project IDs, and an unavailable deployment stop the build. No phone user enters an IP address or needs the laptop's network. The existing Android application ID is retained so direct-install updates can use the existing signing identity. Pilot builds still use the development signing certificate; configure a private release key before store distribution.

For development on a connected device:

```powershell
cd mobile/flutter_app
flutter run --dart-define-from-file=firebase-config.json
```

iOS uses the same configuration and requires a macOS/Xcode signing/build environment. No iOS binary has been produced here.

## Local testing, without a Firebase account or billing

These commands use only the disposable `demo-mangrooves` project. Emulator endpoints bind to loopback.

```powershell
cd firebase
npm.cmd test
npm.cmd run test:emulators
npm.cmd run test:hosting
npm.cmd run test:migration
```

Run these commands one at a time; each emulator suite owns the same loopback ports and disposable database. `test:hosting` checks the Hosting rewrite and deployed-function adapter. `test:migration` imports generated sample data, never the real SQL database.

If Java is not on PATH, set `JAVA_HOME` to a Java 21 installation and add its `bin` directory to PATH. On this computer Android Studio's `jbr` supplies it. If function discovery times out on a busy computer, set `$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'` before starting the emulators. Clear an unrelated `$env:DEBUG` value to avoid verbose CLI logs.

For an interactive local website preview:

```powershell
npm.cmd run build:web -- --emulator
& .\node_modules\.bin\firebase.cmd emulators:start --config ..\firebase.json --project demo-mangrooves --only auth,firestore,storage,functions,hosting
```

In another PowerShell terminal, seed the local database:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8088'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
node firebase/functions/scripts/seed.js --project demo-mangrooves
```

Open `http://127.0.0.1:5002`. Emulator accounts/data are test-only and do not become production accounts. The integration suite resets only its local demo Auth/Firestore data. Never point these tests at a real project. The mobile production client intentionally has no user-editable emulator/server address.

## Operations and remaining checks

Local verification on 2026-10-02: 45 Flutter tests passed (one optional legacy live-server test skipped), Flutter analysis found no issues, and 15 backend/web DOM tests passed. The backend unit suite also passed under Node.js 22. All 38 integration checks passed through local Hosting and Functions with Auth, Firestore, and Storage emulators. A separate migration drill passed three checks: read-only preflight, importing accounts/data/private photos with stable IDs, and rerunning without duplicates. The production website and an unconfigured Android debug APK compiled successfully. The debug APK is a compilation check only; it shows setup instructions until built with a real project configuration.

Production dependency audits (`npm audit --omit=dev` in both `firebase` and `firebase/functions`) reported zero vulnerabilities after updating Sharp and pinning patched transitive packages. The full development-tool audit still reports seven advisory entries inherited through Firebase CLI's FTP/proxy and OpenTelemetry dependencies. They are not shipped in the website bundle or Cloud Functions. Recheck CLI updates before deployment; do not force an incompatible downgrade of Firebase to silence the audit.

- Functions and Storage require a real configured project and billing before live testing. Local success does not prove deployment permissions, billing, domain configuration, or carrier connectivity.
- Verify the connected APK once on mobile data and once on a different Wi-Fi, with the laptop switched off.
- Test all roles in a real browser and on a phone, including photo permissions, GPS, final confirmation, Back controls, PDF saving, and token expiry. Browser visual QA needs an available browser; compilation and API tests alone do not verify layout.
- Reports are online submissions. A failed connection keeps the editable in-screen form; closing/restarting does not provide a durable offline draft queue.
- Current analytics read the scoped reports, in paged database reads. This suits the pilot; introduce maintained aggregates before a much larger rollout to control latency/read costs. Do not silently truncate statistics.
- Export/back up Firestore, Firebase Auth, and Storage according to your retention policy. Budget alerts are not a hard spending cap.
- The legacy PHP website and SQL remain available locally for rollback. To deliberately build a legacy APK, pass `-Backend legacy -ApiBaseUrl https://YOUR_LEGACY_HOST/public/mobile-api`. New builds default to Firebase.

Official references: [Firebase Hosting configuration](https://firebase.google.com/docs/hosting/full-config), [Hosting initialization configuration](https://firebase.google.com/docs/hosting/reserved-urls), [Authentication REST API](https://firebase.google.com/docs/reference/rest/auth), [Importing users](https://firebase.google.com/docs/auth/admin/import-users), [Firebase pricing](https://firebase.google.com/pricing).
