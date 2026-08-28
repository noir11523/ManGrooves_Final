# Deployment and operations

## Production requirements

- PHP 8.1 or newer with PDO MySQL, Fileinfo, mbstring, OpenSSL, and JSON
- MySQL 5.7+/MariaDB 10.4+ with InnoDB and `utf8mb4` (MySQL 8 is preferred)
- Apache/Nginx with the exact document root set to the project's `public` directory
- HTTPS certificate and redirect from HTTP
- Writable `storage/uploads` and `storage/sessions` directories
- Writable `public/generated/analytics` when administrator-triggered Python charts are enabled
- At least 10 GB storage for a pilot; monitor photo growth and plan off-site retention

Python charts are optional. If enabled, install Python 3.10+, pandas, matplotlib, and seaborn. Set `PYTHON_BIN` and `MYSQL_BIN` to executable names on `PATH` or absolute server paths; the web service account must be able to execute them.

## Production deployment

1. Create an empty MySQL database and a dedicated application user with privileges only on that database.
2. Upload the project with `app`, `config`, `database`, `.env`, `storage`, scripts, and tests outside the web root. Configure the site's exact document root as the project's `public` directory. Never expose the whole repository through `htdocs` or `public_html`.
3. If shared hosting cannot select the existing `public` directory as its document root, place only the contents of `public` under `public_html`, keep the private tree above it, and deliberately adjust bootstrap paths. The root and `storage` access-denial files are fallback defenses only.
4. Create `.env` from `.env.example` and set one canonical HTTPS URL:

   ```dotenv
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://mangrooves.example.org
   APP_TIMEZONE=Asia/Manila
   SESSION_LIFETIME=1800
   REGISTRATION_ATTEMPT_LIMIT_PER_HOUR=10
   REPORT_SUBMISSION_LIMIT_PER_HOUR=12
   PENDING_REPORT_LIMIT_PER_GUARDIAN=25
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=assigned_database
   DB_USERNAME=assigned_user
   DB_PASSWORD=a-long-unique-password
   UPLOAD_MAX_MB=5
   CLUSTER_RADIUS_METERS=75
   BARANGAY_MAX_DISTANCE_METERS=5000
   PYTHON_BIN=/usr/bin/python3
   MYSQL_BIN=/usr/bin/mysql
   ```

5. Initialize production without demo data on Windows/PowerShell:

   ```powershell
   .\scripts\install.cmd -ReferenceOnly
   .\scripts\create-admin.cmd
   & 'C:\xampp\php\php.exe' .\scripts\healthcheck.php
   ```

   Reference-only mode imports `database/schema.sql` and `database/reference.sql`; it creates no demo identities or activity. On a platform without PowerShell, import those two SQL files into the configured database, then use a trusted terminal:

   ```bash
   read -rsp 'Administrator password: ' MANGROOVES_BOOTSTRAP_PASSWORD
   export MANGROOVES_BOOTSTRAP_PASSWORD
   php scripts/create-admin.php --name='System Administrator' --email='admin@example.org'
   unset MANGROOVES_BOOTSTRAP_PASSWORD
   php scripts/healthcheck.php
   ```

   Never web-expose `scripts/create-admin.php`.

6. Do not run the default `install.cmd` or import `database/seed.sql` in production. The demo initializer uses fixed development records and must not be rerun over real data.
7. Give the web-server user write access to `storage/uploads` and `storage/sessions`, and to `public/generated/analytics` only if in-app Python regeneration is enabled. Report photos remain outside the web root and are returned only by authenticated, role-checked `photo.php`.
8. Enable HTTPS, HSTS at the hosting/proxy layer, compression, security updates, automated backups, and log monitoring. Keep the application registration/report quotas enabled, and add proxy/WAF rate limits for `register.php`, `login.php`, and `submit-report.php`. For a public deployment, use invitation or verified-email onboarding when operationally available; distributed abuse cannot be solved by a single-server IP limit alone.
9. Open the site on a GPS-capable phone over HTTPS and test permissions, automatic GPS accuracy, manual-pin fallback, private photo access, camera upload, and map tiles.
10. Perform a full journey: guardian submission -> expert correction/verification -> notification -> cluster/timeline -> badge -> follow-up -> filtered analytics/PDF. Static all-time snapshots are intentionally excluded from printed filtered reports.

## VPS deployment

Use a supported Linux distribution, Apache/Nginx plus PHP-FPM, and a dedicated MySQL/MariaDB service. Run the web process under a non-login service account. Restrict the database port to the application host, allow only 80/443 publicly, store `.env` outside backups accessible to untrusted users, and rotate secrets through the hosting control plane.

## Backup

On the local Windows/XAMPP setup:

```powershell
.\scripts\backup.cmd
```

The script reads database settings from `.env`, creates a consistent timestamped SQL dump under `backups`, and removes incomplete output after failure. A complete backup must also copy `storage/uploads` and the exact deployed application/configuration. Store a second encrypted copy outside the server.

To restore, create an empty database, import the chosen SQL dump, restore `storage/uploads` at the same relative paths, deploy the matching code version, update `.env`, and run `scripts/healthcheck.php` against the restored production database. Run automated database tests separately on an isolated test server/account that may create and drop `mangrooves_test`; never grant those test privileges to the production application account.

## Scheduled operations

- Daily: run `php scripts/evaluate-badges.php` to award newly eligible active guardians idempotently.
- Daily: remove `login_attempts` and `registration_attempts` older than the approved retention period.
- Daily or after verification: run `python analytics/generate_charts.py` if static all-time snapshots are enabled.
- Nightly: back up the database and `storage/uploads` to a separate encrypted location.
- Weekly: restore the newest backup in an isolated environment and verify record counts and private photos.

## Monitoring checklist

- HTTPS certificate validity and endpoint uptime
- HTTP 5xx and PHP error logs
- Failed login spikes and unusual audit actions
- Database and private-upload disk capacity
- Latest successful database/upload backup and latest restore drill
- Pending verification age and overdue follow-up counts
- Dependency/OS/PHP security advisories

## Privacy operations

The application collects identity, contact details, precise locations, and photos. Publish a privacy notice specifying purpose, retention, lawful access, correction/deletion channels, and CCENRO contact details. Limit staff access by role, avoid exporting unnecessary personal fields, protect backups, and define a documented incident-response process consistent with the Philippine Data Privacy Act of 2012.
