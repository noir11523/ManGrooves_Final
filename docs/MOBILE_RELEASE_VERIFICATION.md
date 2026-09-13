# Mobile release verification

Verification date: 2026-09-12 (Asia/Manila)

## Verified Android artifact

- File: `mobile/flutter_app/dist/ManGROOVES-Flutter.apk`
- Version: `1.1.5+7`
- Application ID: `org.mangrooves.mobile`
- Size: 53.88 MiB (56,497,958 bytes)
- SHA-256: `D06DE19C93C0762D8D5035631BC80544F1D2E33F1085C927E560F4CB21EF4634`
- Minimum Android SDK: 24
- Target Android SDK: 36
- Native ABIs: `arm64-v8a`, `armeabi-v7a`, `x86_64`
- APK Signature Scheme v2: verified
- Signing certificate: Android development certificate (pilot/direct installation only)

The APK was rebuilt after dependency resolution, static analysis, unit/widget testing, and `assembleRelease`. It first tries the LAN API at `192.168.100.12`, then searches the phone's private LAN if DHCP changes the computer address. The API product identifier is not server authentication: LAN discovery is for trusted pilot networks, while public deployments require HTTPS. The registration screen provides a retry action if configuration cannot be loaded.

This build adds manual map-pin selection (tap, move the map, or enter coordinates), preserves GPS capture, and closes the registration route after successful account creation so the dashboard is visible. GPS capture now requests best-for-navigation updates for up to 30 seconds and accepts only a reported accuracy of `±100 m` or better. Invalid registration data and server errors keep the form entries. A narrow-screen sign-in header overflow found during testing was also fixed.

The normal sign-in and profile interfaces do not display the technical PHP API URL. The connection remains compiled into the application and is documented in `docs/MOBILE_INSTALLATION.md` and `mobile/flutter_app/README.md`.

## Automated results

- Flutter analysis: no issues
- Flutter unit/widget tests: 13 passed, 0 failed; 1 optional live LAN-discovery test skipped
- Flutter release APK rebuild: passed for version `1.1.5+7`
- Native GPS capture: best-for-navigation update stream with a 30-second deadline and `±100 m` acceptance gate
- Browser GPS capture: JavaScript syntax passed; uses uncached high-accuracy updates and rejects coarse readings such as `±50000 m`
- PHP GPS accuracy validation and updated views/API configuration: syntax passed
- Registration navigation: success opens Dashboard with no registration page in Back history
- Registration error handling: rejected submissions preserve entries; invalid email sends no request
- Manual map: explicit selection required; tapping and panning update the pin; cancellation does not return a replacement
- Coordinate entry: invalid/non-finite and out-of-area coordinates cannot be confirmed
- Location request fields: manual coordinates omit GPS accuracy; GPS coordinates retain the measured accuracy
- PHP application tests: 28 passed, 0 failed
- Disposable-database browser/mobile release journey: 96 passed, 0 failed
- Native API registration immediately authenticates requests to Dashboard: passed
- Native multipart photo/checklist submission with manual coordinates and no GPS accuracy: HTTP 201; exact coordinates saved in a pending report
- ReportService PHP syntax: passed
- Tested ReportService synced to the XAMPP copy: SHA-256 hashes matched
- APK metadata and v2 signature: verified after packaging

These database tests passed while MySQL was running, against disposable test databases. They do not override the subsequent live-server failure below. The earlier release's live smoke checks and LAN discovery checks were not repeated successfully after that failure.

The PHP regression case for rejecting a `±50000 m` GPS submission was added but
could not be executed after the source change because the live MySQL server was
already unavailable. Server-side syntax validation passed. Re-run `tests/run.php`
after database recovery before calling that new backend gate acceptance-tested.

## Current local database blocker

During the final live check, Apache responded but MySQL was no longer running.
A normal startup attempt using the existing XAMPP configuration failed. At
2026-09-12 15:12 (Asia/Manila), `C:\xampp\mysql\data\mysql_error.log` reported
`CORRUPT LOG RECORD FOUND`, failure to initialize InnoDB, and startup abort.
The API consequently returns a database-connection error; registration, barangay
loading, and reporting cannot work against this local server until recovery.

No existing application database files were deleted, no recovery flags were enabled,
and no reset of the existing databases was attempted. Back up the MySQL data before a separately approved
recovery operation. After recovery, repeat configuration, registration, and report
submission checks against XAMPP and the actual phone.

## Platform configuration

### Hosting preparation (included in the APK source)

The Flutter source now keeps public HTTPS builds on their configured server,
ignores saved LAN addresses when moving to hosting, and clears sessions belonging
to a different server. These changes are included in this pilot APK, but it is
still configured for the local server. The online APK must be
built with the real hosted endpoint after deployment using `build-apk.cmd -Online`.
See `ONLINE_HOSTING.md`; no hosted domain or online artifact has been provisioned.

Android permissions for internet, camera, fine location, and coarse location are present. The iOS property list is valid and contains camera, photo-library, location, and local-network usage descriptions. The iOS plugin registrar contains secure storage, geolocation, and image picker integrations. Android and iOS use `org.mangrooves.mobile` as the application/bundle identifier.

## Gates that cannot be completed on this Windows computer

No Android phone or Android emulator was connected during the audit, so installation, camera UI, GPS permission dialogs, process restart, and real-device network behavior still require the physical-device checklist in `docs/MOBILE_INSTALLATION.md`.

An IPA cannot be compiled, signed, or installed from Windows. Final iPhone acceptance requires macOS, Xcode, an Apple Developer team, an HTTPS production API, and a physical iPhone.

The current Android artifact uses the development certificate. Before Play Store publication, create and securely back up a private upload/release key, configure Android release signing, rebuild, and re-run this verification. Installing a differently signed production build later will require uninstalling this pilot build.
