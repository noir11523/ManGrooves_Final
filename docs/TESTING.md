# Testing guide

## Automated suite

Browser live-location logic and report-wizard event tests (Node.js; no database):

```powershell
node --test tests/live-location.test.cjs tests/report-location-ui.test.cjs
```

These use simulated device readings to cover coarse/invalid/stale fixes, movement,
temporary errors, permission denial, cancellation, manual coordinates, automatic
start with existing permission, freezing the site before continuing, and background
page cleanup. They verify software behavior, not physical GPS accuracy or rendering.
On a real device, grant site permission, wait for an accurate fix, move a short
distance outdoors, confirm the pin updates, then select the point and confirm it
stays fixed during the health/species steps. Compare the point to a known location.
Repeat with denied permission and with Wi-Fi/GPS unavailable; no coarse reading
should be silently saved as an accurate location. Windows PCs without a compatible
GPS sensor may never obtain an acceptable fix; use a field phone or a manual pin.

Location fallback checks:

- After 15 seconds without a fresh accurate fix (or a transient device error), a
  one-shot low-power device request runs alongside the high-accuracy watch. This
  requests another result; it cannot force Wi-Fi or identify the browser's sensor.
- A coarse reading exposes **Show approximate device area**. Its amber circle is
  map guidance only. Report fields stay untouched and Continue is blocked until
  the user selects an actual map point or cancels the preview.
- IP-area assistance must make **zero GeoJS requests** on page load, permission
  denial, coarse readings, and checking the consent box alone. A request happens
  only after the user checks the box and clicks **Find approximate IP area**.
- The request uses HTTPS, no session cookies, no page referrer or report payload,
  and a 10-second abort deadline. Test blocked service/CORS, invalid JSON, timeout,
  canceled requests, revoked consent, hidden pages, and late responses. Manual
  and newer live selections must never be overwritten.
- GeoJS radius is in kilometers; 50 means 50,000 meters, not 50 meters. Unknown
  accuracy stays unknown. IP results are never GPS, regardless of claimed precision.
- Exact addresses are not inferred from IP areas. The guardian must enter the
  real sitio/site name and select the actual observation point. A city-level IP
  label is never copied into the site-name field.

These automated tests mock GeoJS; they do not establish the provider's availability
or positioning accuracy. A live provider check requires explicit consent to send
the test connection's public IP and request metadata to `https://get.geojs.io`.
The browser connection was unavailable during automated verification; perform the
above interactions on a physical device before treating this as field validated.

Run from the project root against a disposable development/test MySQL server:

```powershell
& 'C:\xampp\php\php.exe' .\tests\run.php
```

The suite drops, creates, and finally removes `mangrooves_test`, so its database account requires `CREATE DATABASE` and `DROP DATABASE`. It imports the real schema/demo seed and never mutates `mangrooves_db`, but it must not run with production credentials or on a server where a valuable database is named `mangrooves_test`.

Coverage includes:

- Fresh schema plus in-place compatibility upgrades, reference counts, and demo password hashes
- Malformed/oversized registration input, NUL-containing passwords, and per-IP registration throttling
- Bounded session old-input preservation for nested observation fields
- Exact health thresholds plus invalid/contradictory answers
- Ranked species matching
- Typed badge metrics
- Verified-only survival and health analytics, unresolved expert species semantics, historical rarity, and the 100% survival cap
- Idempotent overdue follow-up reminder generation
- Required living-count baselines and guardian hourly report quotas
- Immutable historical health-rule and earned-badge snapshots
- Full verification transaction: selected-cluster preservation, state, follow-up scheduling, attention flag, notifications, required audit row, and duplicate-review prevention
- Required rejection feedback, attention-flag clearing on rejection, and self-verification prevention after a role change
- MIME/dimension/path-safe private photo storage and cleanup
- Foreign-key/orphan integrity

## Production health check

The health check is appropriate after installation or restore because it does not create or drop databases:

```powershell
& 'C:\xampp\php\php.exe' .\scripts\healthcheck.php
```

It checks required PHP extensions, writable storage, reference-data minimums, expected tables/columns/indexes, complete historical snapshots, an active system administrator, database connectivity, and basic orphan integrity. Only the reference-only installer uses the temporary `--allow-no-admin` option before the first administrator is created.

PHP syntax can be checked independently:

```powershell
$php = 'C:\xampp\php\php.exe'
Get-ChildItem -Path . -Recurse -Filter '*.php' | ForEach-Object { & $php -l $_.FullName }
```

The repository also includes an HTTP smoke test for public, guardian, expert, administrator, JSON, CSRF, ownership, and access-denied routes. It signs in seeded accounts and therefore writes login attempts, audit records, last-login timestamps, and possibly follow-up reminders to the target application database. Run it only against disposable demo/test data:

```powershell
.\tests\http_smoke.cmd
```

## Isolated release journey

The release harness creates a uniquely named disposable database, starts an isolated PHP server, and removes its database, uploaded test photos, sessions, and listener when it finishes. It leaves the configured `mangrooves_db` database untouched. Its database account still requires `CREATE DATABASE` and `DROP DATABASE`:

```powershell
& 'C:\xampp\php\php.exe' .\tests\e2e_release.php
```

It exercises the complete guardian-to-expert-to-administrator workflow, schema compatibility upgrades, real image uploads, photo ownership/IDOR controls, public role-escalation prevention, correction/confirmation/rejection paths, badge and certificate delivery, follow-ups, staff provisioning/suspension/deletion, profile and password changes, Appendix H analytics permissions, audit integrity, role denials, host-header-safe redirects, third-party asset integrity attributes, and PHP warning/fatal scans.

## Manual end-to-end acceptance run

1. Register a new guardian and update the profile/password.
2. Submit a clear geo-tagged initial report with each checklist section completed. Confirm GPS accuracy appears automatically, a manual pin works without accuracy, and an obviously out-of-barangay point is rejected.
3. Confirm the predicted health score and ranked species are visible before submission.
4. Verify the record is pending and visible in the expert queue.
5. Sign in as an expert; inspect the photo/map/answers and correct then verify it with feedback. Confirm the expert cannot verify their own submitted report after a role change.
6. Confirm the guardian receives a notification, report outcome, badge if eligible, and follow-up date.
7. Confirm the cluster map/timeline and admin analytics now include the verified result.
8. Use the follow-up alert to create a parent-linked report and verify it.
9. Confirm the timeline preserves both photos/health states and the badge metrics count only verified rows.
10. As admin, test role/status changes, the required suspend-before-delete sequence, species/badge edits, audit filters, Python chart refresh, and browser **Print / Save as PDF**. Confirm all-time static snapshots are absent from the filtered printout.
11. Confirm experts see health summaries/high-risk sites but do not receive computed survival values, the PDF action, or the static-chart regeneration action on web or mobile.
12. Attempt direct access to admin pages as a guardian and confirm HTTP 403.
13. Confirm an owner, expert, and administrator can retrieve a report through `photo.php`; another guardian receives 404, and no direct `storage/uploads` URL is public.
14. Attempt a POST without/with an invalid CSRF token and confirm it is rejected. Submit array-shaped values where scalar login/species fields are expected and confirm a controlled validation response without warnings.
15. Attempt a renamed text/script file as a photo and confirm upload rejection.
16. Leave an authenticated session idle beyond `SESSION_LIFETIME` and confirm reauthentication is required. Locally, confirm an empty `APP_URL` preserves the chosen host throughout redirects.
17. Open the guardian dashboard twice around a due follow-up and confirm only one notification exists for each reminder type/link.
18. Repeat key screens at a narrow mobile width and verify the mobile navigation, map, photo capture, and forms remain usable.
