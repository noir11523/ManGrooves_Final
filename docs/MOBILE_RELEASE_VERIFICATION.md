# Mobile release verification

Verification date: 2026-09-05 (Asia/Manila)

## Verified Android artifact

- File: `mobile/flutter_app/dist/ManGROOVES-Flutter.apk`
- Version: `1.1.1+3`
- Application ID: `org.mangrooves.mobile`
- Size: 52.34 MB (54,887,463 bytes)
- SHA-256: `07A28CDDB4A7E573809E7ABEC641CC3B1806F2D5932F6280A5E9F26FC74AA5B5`
- Minimum Android SDK: 24
- Target Android SDK: 36
- Native ABIs: `arm64-v8a`, `armeabi-v7a`, `x86_64`
- APK Signature Scheme v2: verified
- Signing certificate: Android development certificate (pilot/direct installation only)

The APK was rebuilt after dependency resolution, static analysis, widget testing, and `assembleRelease`. The copied `dist` artifact contains the final Appendix H role-specific analytics behavior.

The normal sign-in and profile interfaces do not display the technical PHP API URL. The connection remains compiled into the application and is documented in `docs/MOBILE_INSTALLATION.md` and `mobile/flutter_app/README.md`.

## Automated results

- Flutter analysis: no issues
- Flutter widget tests: 1 passed, 0 failed
- PHP application tests: 27 passed, 0 failed
- Disposable-database browser/mobile release journey: 91 passed, 0 failed
- Live web/authorization smoke tests: 54 passed, 0 failed
- PHP mobile endpoint syntax checks: all passed
- Workspace-to-XAMPP backend hash comparison: 16 files matched
- LAN mobile API configuration request: HTTP 200
- Bearer authentication: anonymous and invalid tokens rejected with HTTP 401
- Login, session restoration, dashboard, reports, and seven-item checklist: passed
- Logout and token revocation: passed
- Disposable guardian registration: passed
- Multipart photo/GPS/checklist report submission: passed
- Protected report detail and protected photo retrieval: passed
- Disposable test account, report, and uploaded photo cleanup: passed

## Platform configuration

Android permissions for internet, camera, fine location, and coarse location are present. The iOS property list is valid and contains camera, photo-library, location, and local-network usage descriptions. The iOS plugin registrar contains secure storage, geolocation, and image picker integrations. Android and iOS use `org.mangrooves.mobile` as the application/bundle identifier.

## Gates that cannot be completed on this Windows computer

No Android phone or Android emulator was connected during the audit, so installation, camera UI, GPS permission dialogs, process restart, and real-device network behavior still require the physical-device checklist in `docs/MOBILE_INSTALLATION.md`.

An IPA cannot be compiled, signed, or installed from Windows. Final iPhone acceptance requires macOS, Xcode, an Apple Developer team, an HTTPS production API, and a physical iPhone.

The current Android artifact uses the development certificate. Before Play Store publication, create and securely back up a private upload/release key, configure Android release signing, rebuild, and re-run this verification. Installing a differently signed production build later will require uninstalling this pilot build.
