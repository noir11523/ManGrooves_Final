# ManGROOVES PHP website on Vercel

## Reports and homepage refinement — October 5, 2026

Reports now use a clear desktop table with report number, site/species, health, status, submitted date and View. Staff also see who submitted the report. On phones, each row becomes a labelled card with one action. Guardians still receive only their own reports; staff access and report submission rules are unchanged.

Verification has four clickable groups: Pending, Verified needing attention, Verified and Rejected. Pending opens the oldest reports first with Review; completed reports open with View. Verified needing attention means verified reports whose recorded health is Stressed, At Risk or Unknown; it does not reopen a review or change the report status. The reviewer’s own reports are excluded from both the list and totals. Totals cover all reviewable reports, while search, health and dates narrow the list. Clicking a group retains those filters and resets pagination. Filter and Reset remain the only search actions; dates use inclusive Manila calendar days.

The Supabase APK `2.0.0+32` includes matching category cards, report information and optional date filters. The homepage retains its existing theme, routes and fast deferred statistics. Repeated role descriptions and “no experience required” copy are removed, and monitoring after planting is the central message. Public and sidebar APK links use a download icon with the short label Android APK.

## Loading improvements — October 5, 2026

The PHP function now uses Vercel `icn1` (Seoul), matching the existing Supabase database's `ap-northeast-2` region. PHP API requests include `x-region: ap-northeast-2` so database-heavy Edge Function work runs there too. If the database moves, update both `vercel/build.mjs` and `app/Cloud/Client.php` together.

The public homepage renders without a statistics API request. Its community totals load afterward through the existing `explore.php?summary_only=1` endpoint. It shows a dash while loading and a brief unavailable message on failure; it never substitutes made-up counts. The legacy MySQL homepage retains its server-rendered totals.

Migration `202610050001_public_summary.sql` adds a read-only, service-role-only aggregate function. It returns four totals in one database call instead of transferring full private report and account records. Apply pending migrations with `node supabase/node_modules/supabase/dist/supabase.js db push --linked` before deploying the updated API. Existing records and API response contracts are preserved.

Protected PHP JSON requests no longer make an extra `me.php` request before the actual endpoint. The API still checks token validity, revocation, current account status and permissions on every protected request; PHP page access checks and CSRF remain in place. Simultaneous identical browser reads and upload-token requests share their pending request, without caching completed private results. Public pages do not load unused notification badges.

Observed initial homepage response times in three live checks changed from 2,666–3,401 ms before the update to 141–257 ms afterward. These measure HTML response time, not full image loading or a guarantee for every connection. PHP execution headers confirmed `icn1`; Supabase regional invocation is also checked separately. Localhost uses the same PHP package, and the existing APK remains compatible with the unchanged API contracts.

**Published October 3, 2026:** https://mangrooves-php.vercel.app . Vercel project: `clements-projects-5174d0c3/mangrooves-php`.

**Updated October 4, 2026:** registration now follows Account details → Verify email → Complete profile. Sign-in has a single password visibility control, clearer Back/Forgot password/Create account actions, and a full-width primary button. The PHP website and Flutter use the same labels and account rules. Experts enter an ID code after email verification and wait for admin approval. The new web assets, public pages, and a validation-only request through the live PHP proxy were checked successfully. No test account or email was created by that check.

This package keeps the original PHP home page, dashboard, navigation, header, and theme. The duplicate sidebar profile card is removed; the top-bar profile menu still shows the account name and role. `public/index.php` is the application entry point behind one Vercel PHP function. Forms, maps, charts, and admin tools use the existing Supabase web components inside the PHP layout.

## Navigation

All three roles use the top-bar bell for notifications, including the unread count. Profile settings and Sign out remain in the top-right account menu; their duplicate sidebar links are removed. Download Android APK follows the workspace links with a small divider instead of a large empty gap. On narrow screens, the More menu contains only extra workspace destinations, while the bottom navigation uses the app's Home, Reports, Submit/Review and Badges/Analytics labels. The short Submit label opens Submit report and fits on small phones. Analytics, Health history and Growth timeline remain available in their existing insights menu.

The Flutter app keeps one Sign out under Account and one Notifications button in the top bar. Report map remains on the dashboard. The report form keeps its existing app-bar Back control instead of a second exit button; automatic drafts remain enabled.

## Report drafts and locations

**Report map:** use **Find a location**, type an address or landmark, then choose a suggestion. The map centers on the selected place and marks it in blue. Existing report pins keep their health colors and still open the report. **Clear location** removes the search pin. Status and Health filters apply immediately, keep the selected location, and are retained in the website URL for refresh. The base map opens before report requests complete, with loading, retry and no-results messages instead of a silent empty area. Missing or invalid report coordinates never become a pin at zero latitude/longitude. The website follows report pagination in the background; the app retains its report-page controls and identifies the page shown. Loaded report locations can also appear in search suggestions when address search is unavailable.

The report wizard keeps its existing four-step layout. It automatically saves fields, checklist answers, the photo and the current step for the signed-in account on this device. Saving and restoring happen quietly without a draft bar, discard button or confirmation prompt. Reopen **Submit report** after refreshing, closing the tab or reopening the app to resume. Successful submission clears the draft; failed submissions retain it. An inline notice appears only when storage fails or restored information needs attention. Drafts do not sync between devices; clearing browser/app data removes them. The website needs an internet connection to reopen its page and current checklist.

In **1. Details**, type at least three characters in **Location name**, then choose a suggestion. **2. Location** opens with that selected point and the location name already filled in. Editing a selected suggestion's name clears that suggestion's pin until another result is chosen or a pin is placed. Free-text landmarks carry into Step 2 and trigger suggestions when no pin has been chosen; typing alone never selects an arbitrary search result. Search errors do not erase the draft. The app carries its location name into its existing map picker as well.

GPS requests a fresh reading and reports its accuracy. It can retry through the device's other location provider. Old readings and late callbacks after manual selection cannot replace the pin. **Find approximate area** uses the network area only to center the map; users must place their actual observation pin. It never turns an IP estimate into an accurate GPS report. Nearby street labels may be suggested when the location name is empty, but do not move the chosen coordinates. Device permissions, signal and map coverage still determine real-world precision.

Both this website and the Flutter APK use the same Supabase project, `rsjwlhqzzvtakcbrzqgi`. No MySQL server, Apache server, local IP address, or shared Wi-Fi is needed by users. An internet connection is required.

## Local preview

Run these commands from the project folder in PowerShell:

```powershell
npm.cmd --prefix supabase ci
npm.cmd --prefix vercel ci
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\mobile\flutter_app\build-apk.ps1 -Backend supabase -SkipClean
npm.cmd --prefix vercel run build
npm.cmd --prefix vercel run preview
```

Open **http://127.0.0.1:8086**. This starts PHP using the existing `supabase/client-config.json`. It uses the same interface, accounts and Supabase data as Vercel. MySQL and Apache are not needed. The publish script permits uploads from both `http://127.0.0.1:8086` and `http://localhost:8086`.

After that first setup, run `scripts\start.cmd` from the project folder. It rebuilds the website from current source and starts the local server. Keep the terminal open and press Ctrl+C to stop. Use the port 8086 address above; the old XAMPP `/mangrooves_v2/public` address remains the legacy MySQL installation. For that older version, use `scripts\start.cmd -Backend legacy` (port 8085). Localhost changes to reports or accounts affect the shared Supabase data, just as they do on Vercel.

## Publish

Build the current Supabase APK first. Website packaging checks its version and SHA-256 against the release metadata, so an older APK cannot accidentally be published as the new release.

```powershell
& .\vercel\node_modules\.bin\vercel.cmd login
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\mobile\flutter_app\build-apk.ps1 -Backend supabase -SkipClean
npm.cmd --prefix vercel run publish
```

Complete Vercel's sign-in page when it opens. Never paste passwords, email app passwords, database passwords, or access tokens into chat.

The publish script:

1. Builds an isolated website package in `vercel/dist`.
2. Links or creates the `mangrooves-php` Vercel project in your signed-in account.
3. Saves the Supabase URL, public key, and a generated session-encryption key as Vercel environment variables.
4. Deploys the PHP website to production.
5. Allows direct photo uploads from the exact deployed addresses in Supabase, keeping the existing Firebase addresses available.
6. Updates the shared Supabase API and checks the public pages and upload CORS permission.

It uses the existing Supabase CLI login. It does not reset the database, import data again, or change the APK's server address. The final URL is printed and saved in ignored `vercel/.vercel/deployment.json`.

## GitHub connection

The Vercel project is connected to **`noir11523/ManGrooves_Final`**, with `main` listed as the production branch. To check it, open **Vercel → mangrooves-php → Settings → Git**.

The source repository and the prepared deployment package have different layouts. For now, publish updates with `npm.cmd --prefix vercel run publish`. The project's Ignored Build Step skips Git builds unless the repository contains the prepared PHP entry point, cloud bootstrap, and compiled browser assets. Pushing source-only changes to `main` does **not** automatically publish the website. The repository connection is complete; an automatic source-to-deployment Git pipeline has not been configured.

The publish script sets Node 22 and this build guard. The generated Vercel configuration sets `outputDirectory` to `.` so both PHP routes and root-level static assets are deployed. Do not change the output directory to `public`.

Do not deploy the repository root as a static website. Only `vercel/dist` is the Vercel deployment package. Database backups, `.env`, account exports, uploaded evidence, and local credentials are excluded. The package includes only the verified current Supabase APK and its checksum under `/downloads/`; these are served as static files and excluded from the PHP function. The PHP function routes requests through an allowlist, so PHP source is not served as text.

**Android download:** `https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk`. The public navigation and signed-in sidebar use this direct file link. The profile dropdown contains Profile settings and Sign out. After a verified guardian finishes registration, the web and app sign in automatically and open the dashboard. If opening the session fails, Continue to dashboard retries with the entered credentials without submitting registration again. Expert applicants remain pending until approved.

## Search and filters

Use **Apply** to search or combine filters, and **Clear** to return to the full list. Searches ignore letter case and extra spaces. Users, audit logs, and review history are filtered before pagination; page links retain the selected filters. Changing a search starts on the first page.

| Web section | Search | Filters |
| --- | --- | --- |
| Users | Name, email, barangay | Role, account status |
| Review reports | Site, report number | Suggested or final health |
| Review history | Report number, reviewer | Decision |
| Audit log | Actor, action, record number | Record type |
| Species catalog | Scientific, common, local name | Active or archived |
| Manage badges | Badge name, description | Active or archived |
| Expert applications | Applicant name, email | Pending, approved, declined |
| Health history / Growth timeline | Cluster name, code, barangay | Latest health |
| Health checklist | Checklist name, question | Search only |

Existing report and report-map filters remain available. Analytics already has date filters. Certificate signer is a single settings form and does not need list controls. Pending or declined expert accounts link to Expert applications instead of displaying editable Active/Inactive controls.

The APK includes matching search controls on its existing Reports, Review reports, Review history, Expert applications, Health checklist, and cluster screens. Filters remain active during pagination and refresh. Report search scrolls with the list on short phones, including when the keyboard is open. Web checklist and catalog searches hide records in place so they retain unsaved edits and selected photos.

## How the connection works

| Part | Where it runs |
| --- | --- |
| Original PHP page layout and dashboard | Vercel PHP function |
| Database and accounts | Supabase PostgreSQL and Auth |
| Photos, checklist pictures, signatures | Supabase Storage through the authorized API |
| Scoring, review permissions, certificates and PDF export | Shared Supabase Edge Function |
| Flutter APK | Connects directly to the same Supabase API |
| Registration and password-reset email | Supabase Auth with your SMTP provider |

PHP uses an encrypted HttpOnly cookie rather than local session files. Server-side role checks use the current Supabase account on every request. Form changes require CSRF protection. Uploads and private file downloads go directly from the browser to the shared API with the signed-in user's token, so a 5 MB field photo does not pass through Vercel's smaller function-body limit.

The frontend receives no service-role key. `APP_KEY` stays on the PHP server. Keep `vercel/.local-key` private; changing the deployed key signs out existing website sessions.

## Checks and remaining setup

As of October 5, 2026, all 18 PHP/browser tests, 52 shared web/backend tests, and 54 API workflow checks pass. Flutter analysis is clean; 80 Flutter tests pass, with one optional local-server test skipped. APK 2.0.0+31 was built and Android version code 31 verified. Search checks cover combined role/status filters, records beyond the first page, preserved page filters, clearing, pending expert approval, and unsaved catalog edits. Mobile checks cover search, pagination, refresh, large text, and a 320×568 phone with the keyboard open. Headless Chrome checked Users, Species, Badges, Audit, and Expert applications at 320, 390, 768, and 1440 pixels using sample records: 20 layouts, no page overflow, working filter/clear controls, and no JavaScript errors.

Existing tests still cover account registration/recovery, role permissions, expert approval, report drafts/photos, reviews, certificates, map search and GPS handling. No physical phone GPS capture or real signed-in production workflow was performed for this update. Gmail accepted a code-send request on October 3; inbox receipt and code entry remain unconfirmed.

The search/filter update and shared Supabase API were published on October 5. Vercel deployment: `mangrooves-ikrjx0i33-clements-projects-5174d0c3.vercel.app`, served at https://mangrooves-php.vercel.app. Live checks verified public pages, exact versioned JavaScript/CSS, search controls, protected Users/Audit/Review history routes, upload CORS, and APK headers. Anonymous list API calls return 401 without account records. Downloading the full public APK produced the same SHA-256 as the tested 2.0.0+31 release: `C2E987F6E105B271B06E32A7EB7EA0C3D2B4957EA19B9B4D9A2B4618F04170FF` (58,630,758 bytes).

Localhost at `http://127.0.0.1:8086` was started using the updated default launcher. Read-only checks verified the same JavaScript/CSS, Supabase project, registration/recovery pages, protected map route, private-file protection and APK release. Upload CORS allows both localhost and 127.0.0.1 on port 8086. No production accounts or reports were created during these checks.

```powershell
npm.cmd --prefix vercel run build
npm.cmd --prefix vercel test
npm.cmd --prefix supabase test
npm.cmd --prefix supabase run test:api
npm.cmd --prefix supabase run check:edge
```

Tests cover the PHP home and dashboard, session tampering, expiry and refresh, password changes, staff/admin permissions, typed expert ID registration, CSRF, hidden source files, route mapping, and direct uploads above Vercel's request-size limit. Existing shared tests cover the report wizard, admin editing, reviews, certificates, scoring, and account workflows.

Before calling the live deployment complete, also check the published pages on desktop and phone, sign in with each real role, submit and review a permitted test report, and download a PDF. Automated tests do not replace those live checks.

**Email sending retest passed:** Gmail SMTP and numeric-code templates are configured. After the Google app password update, the live code request returned HTTP 200 and `ok: true`. Inbox receipt and code entry still need confirmation; see [SMTP setup](SMTP_SETUP.md). This deployment does not add a billing account.

PHP uses the pinned community runtime [`vercel-php@0.9.0`](https://github.com/vercel-community/php), which Vercel lists under [community runtimes](https://vercel.com/docs/functions/runtimes). It is a serverless deployment, so files and sessions must not depend on local persistent disk.

The installed Vercel CLI has upstream development-dependency advisories (34 after compatible `npm audit fix`, including a critical `tar` advisory). The CLI and its Node dependencies are excluded from `vercel/dist` and are not served by the PHP website. A forced CLI downgrade has not been applied or represented as tested. Recheck the toolchain advisories when updating the pinned CLI version.
