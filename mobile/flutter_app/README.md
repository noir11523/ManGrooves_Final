# ManGROOVES Flutter client

This is the native Android/iOS client for the ManGROOVES PHP and MariaDB
system. Guardians can register, monitor sites, submit GPS or manual-pin photo observations,
link follow-ups, view reports and badges, and edit their profile. Experts and
administrators can verify reports and view role-appropriate analytics. Experts
receive health summaries and high-risk results; computed survival metrics remain
restricted to system administrators.

## Server configuration

The server URL is intentionally not displayed in the normal mobile interface.
It is a technical build setting, not user-facing account information.

The current local pilot address is:

```text
http://192.168.100.12/mangrooves_v2/public/mobile-api
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

Hiding the URL in the GUI does not disable the connection. The compiled URL is
only the first address attempted. If it is unavailable, the app scans the
phone's private LAN subnet for an endpoint that identifies itself as the
ManGROOVES API, connects to it, and securely remembers the working address.
Normal DHCP address changes therefore do not require another APK build.

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

The Site step offers **Choose location on map** and **Capture GPS location**.
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

The picker uses `flutter_map` with HTTPS OpenStreetMap tiles, visible linked
attribution, the application's User-Agent, and the library's native tile cache.
It does not download maps in bulk. Map tiles require internet unless cached;
known-coordinate entry remains available without tiles. Before scaling beyond
the pilot, review the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)
and use an appropriate tile service for the expected traffic.
