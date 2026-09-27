# Mobile release verification

Verification date: 2026-09-28 (Asia/Manila)

## Verified Android artifact

- File: `mobile/flutter_app/dist/ManGROOVES-Flutter.apk`
- Version: `1.1.10+12`
- Application ID: `org.mangrooves.mobile`
- Size: 57,843,058 bytes (55.16 MiB)
- SHA-256: `78F9961F3D90A613BE49FB91F5905795972A0B50C406F87B92243C4BC91E6BCA`
- Minimum Android SDK: 24; target Android SDK: 36
- Native ABIs: `arm64-v8a`, `armeabi-v7a`, `x86_64`
- APK Signature Scheme v2: verified after packaging
- Signing certificate: Android development certificate for direct pilot installation

The follow-up audit found and fixed three gaps: overflowing small-phone headers
and analytics cards, stale data when reopening app tabs, and a review queue capped
at its first 50 reports. The queue now supports pagination. Added regression
coverage exercises a 320-pixel phone layout for all three roles, reopened tabs,
queue navigation, and access to every report in a queue exceeding 50 items.

## Included changes

Web and Flutter share the server's report data, health scoring, validation rules,
and role permissions. This release includes:

- Account settings for every role have read-only email and no self-deactivation
  option. Both web and mobile endpoints reject email changes and deactivation.
- Flutter users can change their password with their current password and a
  confirmation. Web and mobile share the 8-25 character policy. Password changes
  revoke old sessions; the web keeps only its current session signed in.
- The redundant All clusters submenu entry is removed.

- Submitted-report maps for guardians, experts, and administrators, with health
  and status filters, pagination, and links from pins to report details. Guardians
  see their own report pins.
- Cluster health maps below Latest reports. Dashboard report totals open matching
  report filters. The redundant dashboard New report button is removed.
- Health history and growth timelines, accessible from the app's Maps and timelines
  menu and the web's Clusters submenu. The web submenu supports hover, click, and
  keyboard use. Mobile web also has a Maps and timelines menu.
- Chronological verified visit counts, changes since the previous count, health,
  species, and authorized evidence. A count change may reflect a different area
  observed; it is not a tree-height measurement. Other guardians' exact coordinates,
  photos, and feedback remain private.
- Staff validation history with reviewer, date, decision, and report links.
  Individual histories show before/after health and species. Automatic Healthy
  verification is included.
- Server-generated assessment previews with the three scored answers and their
  points. All 27 health-answer combinations follow the existing project rules:
  6 Healthy, 3-5 Stressed, and 0-2 At Risk. Context observations cannot inflate the
  health score. Missing scoring criteria fail safely. These checks establish
  software consistency, not scientific validation of the checklist.
- Incomplete or tied species matches remain unresolved. Match percentages describe
  trait similarity. Edited expert assessments require Save correction and verify;
  Confirm suggestion is available for unchanged suggestions.
- None of the above and All of the above for multiple-answer groups only, mutually
  exclusive within each group. Conflicting animal observations clear each other.
- Healthy submissions automatically verify without entering the review queue.
- A four-step report form: Site, Health, Details, Review. Follow-up choices are
  hidden until enabled. Back, exit, section editing, updated summaries, and a final
  submission confirmation preserve control over the report.
- GPS uncertainty circles, approximate-area guidance, explicit saved pins, and
  shared location validation. Coarse estimates do not silently become report pins.
- Separate first and last names in registration/profile, 8-25 character passwords,
  staff notifications, and actual downloadable administrator PDF exports.

## Automated results

| Check | Result |
| --- | --- |
| PHP domain/integration suite | 42 passed, 0 failed |
| Disposable-database web/mobile HTTP journeys | 196 passed, 0 failed |
| JavaScript location/report-flow tests | 37 passed, 0 failed |
| Flutter unit/widget tests | 31 passed, 0 failed; 1 optional live LAN-discovery test skipped |
| Flutter analyzer | No issues found |
| Android release build | Completed |
| APK metadata, v2 signature, checksum | Verified |
| Application database health check | OK |
| Live XAMPP mobile configuration endpoint | Valid API identity and barangay list |

The PHP/HTTP checks used disposable databases and cleaned them up. They exercised
role restrictions, report and photo access, health previews, correction/rejection,
automatic verification, maps, timeline privacy, history links, PDF responses,
notifications, separate names, passwords, and review flows. HTTP responses and
server logs contained no PHP warnings, notices, deprecations, or fatal errors.

Phone-size widget checks covered report editing and final confirmation, GPS/manual
selection, map filters and paging, health/growth tabs, private evidence links,
validation details, and expert correction. Empty timelines and zero living counts
also have regression coverage.

The September 12 database startup problem recorded in the previous release notes
was not present during this verification. The existing database passed the health
check, and XAMPP served the API successfully. No database reset or recovery flags
were used for this release.
During the follow-up audit, Apache and MySQL were stopped. Both started normally;
the database health check and live configuration endpoint passed again. These
services must remain running when using the local web app or APK.

## Server and installation

The APK first tries `http://192.168.100.12/mangrooves_v2/public/mobile-api` and can
discover the configured ManGROOVES API on the phone's private LAN. Apache and MySQL
must be running, and the phone must be able to reach the computer on the local
network. The API product identifier is not cryptographic server authentication.

For a hosted release, build with the actual public HTTPS endpoint using
`build-apk.ps1 -Online -ApiBaseUrl 'https://YOUR-DOMAIN/mobile-api'`. Hosted builds
stay on the configured server and do not scan LAN addresses. No hosted deployment
was created as part of this update.

See [Mobile installation](MOBILE_INSTALLATION.md) and
[Flutter README](../mobile/flutter_app/README.md) for installation and server setup.

## Remaining manual acceptance

The browser automation tool was unavailable, so this release has automated web
route/behavior checks but no live visual browser sign-off. No Android device or
emulator was connected. Real camera capture, GPS reception and permission dialogs,
map-tile network behavior, and installation still need a physical-device check.

An iPhone IPA requires macOS, Xcode, and Apple signing credentials. This Windows
release verifies the shared Flutter code and produces the Android APK only.
Play Store publication also requires a private release/upload signing key; the
current APK retains the existing pilot development certificate.
