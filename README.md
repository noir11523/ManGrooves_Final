# ManGROOVES

ManGROOVES is a responsive community mangrove monitoring and environmental decision-support application for the CCENRO pilot site in Barangay Inayawan, Cebu City.

It includes guardian field reporting, GPS/manual map location, private photo evidence, illustrated health observations, ranked species suggestions, expert verification and feedback, automatic clusters, follow-up timelines, notifications, badges and printable certificates, interactive maps, analytics, printable official reports, user/species/badge administration, and audit logs.

## Quick start on this computer

1. Open XAMPP Control Panel and make sure MySQL is running. Apache is optional when using the included PHP development server.
2. Open PowerShell in `C:\mangrooves_v2`.
3. Initialize a fresh development database with demo data:

   ```powershell
   .\scripts\install.cmd
   ```

4. Start the application:

   ```powershell
   .\scripts\start.cmd
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
```

Automated database and HTTP tests are for disposable development/test environments only; see `docs/TESTING.md` before running them.

## Documentation

- [Setup guide](docs/SETUP.md)
- [User guide](docs/USER_GUIDE.md)
- [Technical guide](docs/TECHNICAL_GUIDE.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Data and scoring decisions](docs/DATA_AND_SCORING.md)
- [Generated image assets](docs/IMAGE_ASSETS.md)
- [Testing guide](docs/TESTING.md)

## Technology

- PHP 8.2 with PDO and prepared statements
- MariaDB/MySQL with InnoDB
- Bootstrap 5, custom responsive CSS, Leaflet/OpenStreetMap, and Chart.js
- Browser Geolocation API and camera/file capture
- Installable progressive web app for mobile field use
- Optional Python/pandas/matplotlib static analytics generation
