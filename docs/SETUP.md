# Setup guide

## Option A: included PHP server (recommended for development)

### 1. Start MySQL

Open XAMPP Control Panel and start **MySQL**. On this computer it listens on port `4306`; many XAMPP installations use `3306`.

### 2. Configure the application

The repository includes a local `.env`. Confirm these values:

```dotenv
APP_ENV=development
APP_DEBUG=true
APP_URL=
SESSION_LIFETIME=1800
REGISTRATION_ATTEMPT_LIMIT_PER_HOUR=10
REPORT_SUBMISSION_LIMIT_PER_HOUR=12
PENDING_REPORT_LIMIT_PER_GUARDIAN=25
DB_HOST=127.0.0.1
DB_PORT=4306
DB_DATABASE=mangrooves_db
DB_USERNAME=root
DB_PASSWORD=
BARANGAY_MAX_DISTANCE_METERS=5000
PYTHON_BIN=C:\Windows\py.exe
MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe
```

If `.env` is missing, copy `.env.example` to `.env` and edit it. `PYTHON_BIN` and `MYSQL_BIN` may be executable names available on `PATH` or absolute paths. Never place a production password in a public directory or commit it to source control.

### 3. Initialize a fresh demo database

From PowerShell in the project root:

```powershell
.\scripts\install.cmd
```

`install.cmd` reads `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` from `.env`. Explicit non-secret parameters can override them for one run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Port 3306 -DatabaseName mangrooves_demo
```

The default installer imports `database/schema.sql` and the development-only `database/seed.sql`, then runs the application health check. It contains fixed demo accounts and activity and can reset those records. Run it only against a new or disposable development database; it is not a migration tool and must not be rerun after real data has been entered.

### 4. Start the site

```powershell
.\scripts\start.cmd
```

Visit <http://127.0.0.1:8085>. Keep the PowerShell window open while using the site; press `Ctrl+C` to stop it. An empty local `APP_URL` keeps redirects on whichever host (`127.0.0.1` or `localhost`) you chose; do not alternate hosts during one session.

### 5. Sign in

Use any account in the README. All development accounts initially use `Mangrooves123!`.

## Production-safe database initialization

Configure `.env` for an empty production database, then run:

```powershell
.\scripts\install.cmd -ReferenceOnly
.\scripts\create-admin.cmd
& 'C:\xampp\php\php.exe' .\scripts\healthcheck.php
```

Reference-only mode imports `database/schema.sql` and `database/reference.sql`. It contains the approved barangay, species, health questionnaire, and badges, but no users, reports, clusters, notifications, or demo activity. The installer temporarily allows the expected no-admin state; `create-admin.cmd` then prompts securely for the first administrator's name, email, and password of 12 to 72 characters. The final health check must pass without `--allow-no-admin`.

## Apache/XAMPP

Apache's exact `DocumentRoot` must be `C:/mangrooves_v2/public`, not the project directory and not a parent such as `htdocs`. A minimal local virtual host is:

```apache
<VirtualHost *:80>
    ServerName mangrooves.local
    DocumentRoot "C:/mangrooves_v2/public"
    <Directory "C:/mangrooves_v2/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Add `127.0.0.1 mangrooves.local` to the Windows hosts file, restart Apache, and consistently open `http://mangrooves.local`. Keeping `APP_URL` empty is recommended locally; set it to the canonical HTTPS origin in production.

The root and `storage` `.htaccess` files provide defense in depth for accidental Apache exposure. They are fallback safeguards, not a substitute for setting `public` as the exact web root.

## Browser permissions

- Allow location access when submitting a report. If GPS is unavailable, place the pin manually on the map.
- Allow camera access or choose an existing JPG, PNG, or WebP photo.
- A secure HTTPS origin is required for geolocation in production. Browsers allow it on `localhost` during development.

## Upload rules

- Maximum size: 5 MB by default (`UPLOAD_MAX_MB` in `.env`)
- Formats: genuine JPEG, PNG, or WebP
- Dimensions: 100–12,000 pixels per side and at most 50 megapixels
- Stored names are cryptographically random and executable uploads are rejected.
- Report photos are stored outside the web root under `storage/uploads` and are served only through authenticated, role-checked `photo.php` requests. Guardians can retrieve only photos attached to their own reports; experts and administrators can retrieve report evidence for review.

Report coordinates must be within `BARANGAY_MAX_DISTANCE_METERS` (5 km by default) of the assigned barangay center. Adjust this deployment setting only when approved monitoring boundaries require a wider radius.

## Troubleshooting

### Database connection refused

Confirm MySQL is running and check its port in `C:\xampp\mysql\bin\my.ini`. Make `.env`, the installer `-Port`, and XAMPP agree.

### Page links open the wrong host or port

For local development, leave `APP_URL` empty and use one host consistently. For production, set it to the exact canonical HTTPS URL without a trailing slash.

### Location is unavailable

Enable browser and Windows location permissions. Use `localhost` locally or HTTPS in production. The manual map pin remains available as a fallback.

### Uploaded photo is rejected

Do not rename a non-image file to `.jpg`. Confirm the image is below the configured limit and is a genuine JPEG, PNG, or WebP.

Each report must use fresh evidence. The application rejects an identical photo reused by the same guardian within 30 days, limits each guardian to 12 submissions per hour and 25 pending reports by default, and removes a just-uploaded file when a quota check fails. Adjust the report-limit settings only after reviewing expert capacity and storage monitoring.

### Health check fails

The health check verifies required PHP extensions, writable `storage/uploads`, writable `storage/sessions`, writable generated-analytics storage, minimum reference counts, expected tables/columns/indexes, complete historical snapshots, an active administrator, and basic foreign-key integrity. Fix every reported failure before use. The reference-only installer is the sole workflow that invokes it with the temporary `--allow-no-admin` exception.
