# ManGROOVES Flutter client

This is the native Android/iOS client for the ManGROOVES PHP and MariaDB
system. Guardians can register, monitor sites, submit GPS or manual-pin photo observations,
link follow-ups, view reports and badges, and edit their profile. Experts and
administrators can verify reports and view role-appropriate analytics. Experts
receive health summaries and high-risk results; computed survival metrics remain
restricted to system administrators.

## Server configuration

Local pilot builds include a small sliders icon below the sign-in buttons,
with the tooltip **Server connection**. Tapping it opens a dismissible popup;
connection settings stay hidden until requested. If
automatic discovery fails, enter the laptop's Wi-Fi IPv4 address (and Apache
port if different from the build setting), then select **Check and connect**.
The app verifies the API before saving the address. Switching servers clears
the previous login session. Hosted builds keep their configured HTTPS server.

The current local pilot address is:

```text
http://192.168.213.53/mangrooves_v2/public/mobile-api
```

Build for a different local computer address from the repository root:

```powershell
.\mobile\flutter_app\build-apk.ps1 `
  -ApiBaseUrl 'http://YOUR-PC-IP/mangrooves_v2/public/mobile-api'
```

For production Android and iPhone builds, use the public HTTPS endpoint:

```text
https://YOUR-DOMAIN/mobile-api
```

The compiled URL is only the first address attempted. If it is unavailable, the app scans the
phone's private LAN subnet for an endpoint that identifies itself as the
ManGROOVES API, connects to it, and securely remembers the working address.
Discovery preserves the configured API path and port. If discovery is blocked
or misses the server, use **Server connection**; DHCP address changes do not
require another APK build after installing this version.

The updated source must be rebuilt and the new APK installed on the phone;
changing files on the laptop does not update an already installed app. Building
requires Flutter, an Android SDK and a compatible JDK. The build script accepts
`-FlutterSdk`, `-AndroidSdk` and `-JavaHome` for nonstandard installations, and
respects existing SDK environment variables. Verify the manual connection flow
and endpoint rules from `mobile/flutter_app` with:

```powershell
flutter test test/api_endpoint_policy_test.dart test/server_connection_test.dart
```

Automatic discovery still requires Apache and MySQL to be running and the phone
and server computer to be on the same non-guest local network. Production builds
should use a stable public HTTPS endpoint instead of relying on LAN discovery.

See `docs/ONLINE_HOSTING.md` at the repository root for online deployment. Once
the hosted API works, `build-apk.ps1 -Online -ApiBaseUrl 'https://YOUR-DOMAIN/mobile-api'`
validates it and builds `dist/ManGROOVES-Online.apk`. Hosted clients ignore saved
LAN addresses, keep sessions scoped to their server, and do not scan local networks.
The API identity string identifies the product; it is not a cryptographic identity
check. Public deployments rely on HTTPS certificate verification.

See `docs/MOBILE_INSTALLATION.md` for Android installation and Mac/iPhone build
steps.

## Registration and report location

Successful registration returns the new authenticated user to the sign-in route,
which opens the dashboard after the registration route closes. Errors preserve
the form entries. Regression tests cover successful navigation, rejected
registration, and invalid email validation.

The Site step offers **Choose location on map** and **Find my location**.
The map opens near the account's barangay or selected cluster. Guardians must
explicitly choose a field location; the initial center is not a submitted pin.
Tap the map, move it underneath the pin, or enter known coordinates, then confirm.
Manual selections send `location_source=manual` and omit `location_accuracy`;
GPS selections retain their measured accuracy. The backend checks the barangay
boundary for both methods. Native GPS capture listens for best-for-navigation
updates for up to 30 seconds and requires the server-configured accuracy threshold
(default `±100 m`); a broad network estimate is not saved as GPS. See
`location_picker_test.dart`, `report_location_test.dart`,
and the disposable-database API journey in `tests/e2e_release.php`.

Reports have four steps: Site, Health, Details, and Review. Edit buttons return
to the selected section without clearing answers. The summary refreshes with
the latest edits, and a final confirmation is required to send the report.
Follow-up choices stay hidden until **This is a follow-up** is enabled.
Back controls return to the previous step or dashboard; leaving the report tab
keeps the in-memory draft until sign-out or app restart.

Guardian, expert, and administrator dashboards show the cluster health map
below Latest reports. Tapping report totals opens the corresponding status
filter; Clusters scrolls to the map. Report lists include filters and pagination.
See `dashboard_navigation_test.dart` and `report_review_test.dart` for the
phone-layout, editing, cancellation, and submission checks.

The **Maps and timelines** menu is available to guardians, experts, and administrators.
**Report map** shows submitted locations, health/status filters, report details,
and pagination. Guardians see their own report pins. **Health history** and
**Growth timeline** open verified visits for permitted clusters. Counts describe
living mangroves observed, not measured tree height. Other guardians' private
photos, coordinates, and feedback stay hidden.

The Verify tab includes **Validation history** for experts and administrators.
Its pending queue is paginated, so older reports remain reachable beyond the first
50. Reports, Verify, Analytics, and Badges refresh when reopened. The app header
and analytics cards also fit narrow phone screens; full-shell tests cover all roles.
Report details show before/after health and species, reviewer, date, and feedback.
Healthy automatic decisions appear in history too. Changing a suggested result
requires **Save correction and verify**; unchanged suggestions use **Confirm suggestion**.

The Health step previews the server's score and each scored answer. All three
health questions must be answered; context choices cannot inflate the six-point
score. Conflicting animal answers clear each other. Species ties stay unresolved,
and percentages describe trait matching rather than scientific confidence.
See `monitoring_history_test.dart` and `docs/DATA_AND_SCORING.md` at repository root.

The picker uses `flutter_map` with HTTPS OpenStreetMap tiles, visible linked
attribution, the application's User-Agent, and the library's native tile cache.
It does not download maps in bulk. Map tiles require internet unless cached;
known-coordinate entry remains available without tiles. Before scaling beyond
the pilot, review the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)
and use an appropriate tile service for the expected traffic.
