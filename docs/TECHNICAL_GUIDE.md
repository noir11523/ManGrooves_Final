# Technical guide

## Architecture

ManGROOVES is a server-rendered PHP application with JSON endpoints for interactive maps, previews, and report details.

```text
Mobile/desktop browser
        |
        | HTTPS, session cookie, CSRF token
        v
Apache or PHP server -> public/*.php and public/api/*.php
        |                         |
        v                         v
Core security/auth helpers     Domain services
        |                         |
        +------------+------------+
                     v
              PDO prepared queries
                     |
                     v
              MySQL/MariaDB InnoDB
```

The responsive progressive web app is the mobile field interface. It uses the same validated backend and avoids storing passwords or report data in insecure native preferences.

## Directory map

| Path | Purpose |
|---|---|
| `app/Core` | Environment loading, PDO connection, sessions/RBAC, CSRF, escaping, views, and audit logging |
| `app/Services` | Health, species, uploads, reporting, verification, badges, and analytics domain logic |
| `app/Views` | Layout and role-specific server-rendered screens |
| `config` | Application configuration assembled from `.env` |
| `database` | Schema, production-safe reference data, and development/demo seed |
| `public` | The only web-exposed directory: entry points, APIs, static assets, and generated charts |
| `analytics` | Optional Python chart generator |
| `scripts` | Installation, first-admin bootstrap, startup, health check, badge evaluation, and backup operations |
| `storage/uploads` | Private randomized report photos outside the web root |
| `storage/sessions` | Private PHP session files |
| `tests` | Unit, database-integration, authorization, and HTTP smoke checks |

## Data model

- `barangays` and `users` provide jurisdiction and RBAC identity.
- `mangrove_species` stores searchable taxonomy plus three visible matching traits.
- `health_criteria` and `health_options` provide a data-driven questionnaire.
- `reports` stores immutable submissions, automatic suggestions, expert outcomes, optional follow-up parent, photo metadata, GPS accuracy, and seedling observation.
- `report_observations` snapshots criterion/option codes, labels, ordering, grouping, selection mode, and points so later rule edits or retirement do not rewrite or hide historical answers.
- `mangrove_clusters` stores verified monitoring sites and their current derived state.
- `verification_logs` preserves confirm/correct/reject changes.
- `badges` and `user_badges` implement typed milestones.
- `notifications` provides the in-app event stream.
- `audit_logs` records security and administrative actions.
- `login_attempts` and `registration_attempts` support indexed authentication/onboarding throttling.

The full executable definition is `database/schema.sql`; interpretation decisions are in `DATA_AND_SCORING.md`.

## Request security

- `app/bootstrap.php` sets same-site, HTTP-only session cookies, an idle timeout, clickjacking/MIME/referrer/permissions protections, and a restrictive Content Security Policy.
- Every state-changing browser form validates its CSRF token.
- `Auth::requireLogin()` and `Auth::requireRoles()` protect pages before data access.
- Public registration cannot request a privileged role.
- Login failures are throttled after five failures for the same email/source-IP pair or 25 failures from one IP within 15 minutes, preventing one remote source from globally locking another user's account.
- Public registration is limited per source IP. Guardian reports have hourly and pending-queue limits, and a guardian cannot reuse the exact same photo within 30 days.
- Passwords use `password_hash()`/`password_verify()`, are limited to 72 bytes to avoid bcrypt truncation ambiguity, and are transparently rehashed when needed.
- Output is escaped with `e()`; map/chart payloads are JSON encoded.
- PDO native prepared statements are mandatory; emulated prepares are disabled.
- Upload validation checks the PHP upload source, actual size, Fileinfo MIME, image decoder metadata, dimensions, randomized filename, and safe extension. Files live under private `storage/uploads`; `public/photo.php` authenticates the viewer, enforces guardian ownership or staff role, revalidates the MIME type, and returns `private, no-store` responses.
- Verification and its downstream changes run in an InnoDB transaction with row locks.
- Administrator deletion requires an already suspended account with no report, verification, or audit history and preserves at least one active administrator.
- Important authentication, verification, and administrative actions create audit records.

Production still requires HTTPS, a non-root database account, secure server/firewall configuration, tested backups, and monitoring. Apache/Nginx must expose exactly `public`; the root and `storage` access-denial files are defense-in-depth fallbacks, not the primary boundary.

## Database initialization

- `scripts/install.cmd` imports `schema.sql` plus `seed.sql` for a fresh, disposable development database. The demo seed uses fixed records and must not be rerun after real activity begins.
- `scripts/install.cmd -ReferenceOnly` imports `schema.sql` plus `reference.sql` without demo identities or activity.
- `scripts/create-admin.cmd` securely creates the first production administrator after reference-only initialization.
- The scripts read database connection settings from `.env`; explicit command parameters take precedence.
- `schema.sql` defines fresh installs and includes idempotent compatibility upgrades for the security, notification-deduplication, badge-snapshot, and observation-snapshot columns introduced by this release. It is not a general versioned migration framework; future structural changes should use numbered migrations.
- `scripts/healthcheck.php` validates required extensions, writable storage, reference minimums, an active administrator, database connectivity, and basic orphan integrity. Reference-only installation temporarily permits the expected no-admin state.

## Domain behavior

### Submission

The report service validates coordinates globally and against the assigned barangay radius, preserves browser-provided GPS accuracy when GPS is used, validates parent/cluster relationships, the required living count, all selected options, and traits. A new site requires a positive count so verification can establish a survival baseline; existing clusters may record zero. It stores the randomized private upload and report/observation rows in a transaction; a failure removes the newly stored photo.

### Verification

The verifier service locks the verifier, report, and candidate clusters. Only pending reports can transition, and a submitter cannot verify their own report after a role change. It writes the final result, assigns/creates a cluster, updates the cluster's current state, schedules a 30-day follow-up, records verification and attention notifications, and evaluates eligible badges inside the same transaction. Badge awards remain idempotent.

### Analytics

Only verified rows drive ecological metrics. Current cluster survival uses the newest verified observed-alive count divided by initial seedlings and is capped at 100%; missing quantities remain unavailable. Health, verification, turnaround, correction, rejection, growth, and high-risk summaries all accept server-side date/barangay/species filters. Static Python snapshots are all-time, administrator-generated screen references and are excluded from printed filtered reports.

## Scheduled operations

Recommended production schedule:

- Nightly: database dump plus `storage/uploads` backup to a separate encrypted location.
- Daily: clean `login_attempts` and `registration_attempts` older than 30 days.
- Daily: run `php scripts/evaluate-badges.php` so configuration changes and delayed eligibility are awarded idempotently.
- Daily or after verification: run `python analytics/generate_charts.py` if static charts are used.
- Weekly: restore the newest backup in an isolated environment and verify counts/photos.
- Monthly: review inactive/suspended accounts, PHP/OS security updates, disk usage, and audit anomalies.
