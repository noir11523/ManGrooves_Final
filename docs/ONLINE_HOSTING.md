# Make ManGROOVES available from other places

## Why the PC currently has to stay on

The APK is a client. Apache executes the PHP API and MySQL/MariaDB stores accounts,
reports, and other shared data. At present both services run on your own PC. LAN
discovery can find a changed local IP; it cannot make that PC available after it
shuts down or connect a classmate on a different network.

The lasting setup is:

`Android/iPhone/browser -> public HTTPS domain -> hosted PHP API -> private hosted database`

With this setup the hosting provider runs the services, your PC can be off, and
classmates can register over Wi-Fi or mobile data. There is no new live domain in
this repository yet: a hosting account and deployment are still needed.

## What to arrange

Use an existing school server if available, or hosting for a custom PHP application
with MySQL/MariaDB, HTTPS, persistent file storage, and backups. A domain or a stable
provider-supplied hostname is sufficient. Hosting a database alone is insufficient:
the PHP application also needs to run online.

For the supplied archive, confirm that the provider can set the domain's document
root to the project's `public` folder, and offers terminal access for creating the
first administrator. PHP 8.2 or newer with `pdo_mysql`, `fileinfo`, `mbstring`,
OpenSSL, and JSON is required. Use supported MySQL/MariaDB with InnoDB and utf8mb4.
If the host fixes the document root to `public_html`, arrange the layout with the
host before uploading; do not put the whole private application in `public_html`.

The PHP charts work without Python. Hosting with Python/cron support is needed for
the optional generated PNG analytics. Ask about this before selecting a plan if
the Python portion is required for your defense.

GitHub stores your source. GitHub Pages does not execute the PHP backend:
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Prepare and upload the package

1. In PowerShell, from `C:\mangrooves_v2`, run:

   ```powershell
   .\scripts\package-hosting.cmd
   ```

2. Use the new `dist/ManGROOVES-hosting-<timestamp>-<id>.zip`. It contains source,
   schema/reference SQL, empty runtime storage, and a production `.env` template.
   It excludes the real local `.env`, backups, demo accounts, session files,
   uploaded photos, generated local analytics, Git history, and mobile build files.
3. Upload and extract into a private application directory on the hosting server.
   Point the domain's document root to the extracted `public` directory. Preserve
   hidden files such as `.htaccess` and `.env` when extracting.
4. Create a new empty database and a database user in the hosting control panel.
   Grant that user access only to the application database.
5. In the hosting file manager, edit the extracted `.env`. Replace every
   `REPLACE_...`/`YOUR-HOSTING-DOMAIN` value with your actual hosting settings:

   ```dotenv
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://YOUR-HOSTING-DOMAIN
   DB_HOST=HOST_GIVEN_BY_PROVIDER
   DB_PORT=3306
   DB_DATABASE=YOUR_DATABASE_NAME
   DB_USERNAME=YOUR_DATABASE_USER
   DB_PASSWORD=YOUR_NEW_DATABASE_PASSWORD
   ```

   Do not copy the local XAMPP `root` account or port `4306` unless the hosting
   provider explicitly supplies those settings. Never put database credentials
   into the APK or GitHub.
6. Open the hosting phpMyAdmin, select the new empty database, and import these
   files in order: `database/schema.sql`, then `database/reference.sql`.
   Do not import `seed.sql` or an old demo backup. This starts a new online
   database; existing local users/reports are not transferred automatically.
7. Create the administrator through the host's trusted terminal (Bash example):

   ```bash
   cd /path/to/your/private/application
   read -rsp 'New administrator password: ' MANGROOVES_BOOTSTRAP_PASSWORD
   export MANGROOVES_BOOTSTRAP_PASSWORD
   php scripts/create-admin.php --name='System Administrator' --email='YOUR-ADMIN-EMAIL'
   unset MANGROOVES_BOOTSTRAP_PASSWORD
   php scripts/healthcheck.php
   ```

8. Ensure `storage/uploads`, `storage/sessions`, and `public/generated/analytics`
   are writable by PHP. Enable the hosting HTTPS certificate and force HTTPS.
   Only the PHP server connects to the database; the phone uses the HTTPS API.

## Verify before distributing a new APK

1. Open `https://YOUR-HOSTING-DOMAIN/mobile-api/configuration.php` from a phone
   with Wi-Fi off and mobile data on. It should return `ok: true`,
   `api_id: org.mangrooves.mobile-api`, and a nonempty Barangay list.
2. Open the online website, register a test guardian, sign out, sign in, and check
   that it appears in online administration. Test a photo/report and verification.
3. Stop XAMPP on your PC and repeat the online registration check. Success now
   demonstrates that the site is using hosting rather than the local PC.
4. Build the APK with the real HTTPS API URL (from the repository root):

   ```powershell
   .\mobile\flutter_app\build-apk.cmd -Online -ApiBaseUrl 'https://YOUR-HOSTING-DOMAIN/mobile-api'
   ```

   `-Online` checks HTTPS and the live Barangay endpoint before building. It writes
   `mobile/flutter_app/dist/ManGROOVES-Online.apk` separately from the local pilot
   APK. It cannot build an online app until the endpoint is deployed and reachable.
   The existing direct-install development signing key is retained; publishing
   through an app store requires the release-signing setup in the mobile guide.
5. Share the online APK with classmates. Hosted builds use the configured domain,
   ignore saved LAN addresses, and never fall back to scanning a classmate's LAN.
   Moving from the local database to hosting requires signing in again; use an
   account registered on the hosted database.
6. For iPhone, use the same HTTPS URL when building on a Mac:

   ```bash
   cd mobile/flutter_app
   flutter pub get
   flutter build ipa --release --dart-define=API_BASE_URL=https://YOUR-HOSTING-DOMAIN/mobile-api
   ```

   Complete Xcode signing, remove the pilot arbitrary-HTTP allowance, and test on
   an iPhone before distribution. See `docs/MOBILE_INSTALLATION.md`.

## Automatic startup and temporary demos

Installing Apache/MySQL as automatic Windows services can start them when the PC
boots, but does not help when the PC is off, asleep, offline, or unreachable from
outside the router. It is a local-development convenience.

A tunnel is another option for a short remote demonstration, but the PC, PHP
server, database, and tunnel process must all stay running. A temporary URL can
change. Cloudflare Quick Tunnels are documented for testing, without an uptime
guarantee: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/

For normal use by classmates from different locations, finish the hosted setup
above and use its stable HTTPS domain. Schedule database and private-photo backups
on the host; see `docs/DEPLOYMENT.md`.
