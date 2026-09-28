# Mobile release verification

Verification date: 2026-09-28 (Asia/Manila)

## Verified Android artifact

- File: `mobile/flutter_app/dist/ManGROOVES-Flutter.apk`
- Version: `1.1.12+14`
- Application ID: `org.mangrooves.mobile`
- Size: 57,875,878 bytes (55.19 MiB)
- SHA-256: `BD2827C40D203922BA8C295FB4DE95510A9FC62418A79F2BA8111A0A568BD99E`
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

- Analytics appears above Health history in the web Clusters menu and replaces
  Report map in the app's top menu. The redundant Report map button is removed
  from web My reports; Flutter Reports retains its map.
- Guardians see their own report totals, health distribution, monthly verified
  reports, and attention reports. Experts and administrators see all users'
  aggregated data. The authenticated account determines scope on the server;
  request parameters cannot select another guardian or widen personal access.
- Personal cluster summaries use the guardian's latest verified visit, including
  when another user submitted a newer visit to the same cluster. Empty accounts
  see empty statistics. PDF export and survival figures remain administrator-only.

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
- Health history and growth timelines, accessible from the app's Analytics and timelines
  menu and the web's Clusters submenu. The web submenu supports hover, click, and
  keyboard use. Mobile web also has a Analytics and timelines menu.
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
- All of the above is available in leaf color, pests, and roots and uses the
  lowest regular score (0), keeping mixed conditions out of automatic Healthy
  verification. Environmental multiple-answer groups retain All of the above
  (sum of regular choices) and None of the above (0).
- Not Sure is capitalized consistently and available in every checklist group.
  It stays unscored, makes the report pending, and requires an explicit final
  health decision from a reviewer. Special choices are exclusive in their group.
- Administrators can edit checklist names, questions, normal choice labels,
  points, guide photos, and choice photos from web Health checklist or app Account.
  Updates have role checks, audit logs, stale-edit protection, and genuine-image
  validation. Existing reports keep their recorded scores and answer snapshots.
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
| PHP domain/integration suite | 50 passed, 0 failed |
| Disposable-database web/mobile HTTP journeys | 219 passed, 0 failed |
| JavaScript location/report-flow tests | 37 passed, 0 failed |
| Flutter navigation/widget checks | 33 passed, 1 optional live-LAN test skipped |
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
also have regression coverage. The checklist editor is tested at a 320-pixel
phone width, including save confirmation, score editing, and keeping/discarding
unsaved changes. Unknown reports and all health aggregate choices are covered.

The September 12 database startup problem recorded in the previous release notes
was not present during this verification. The existing database passed the health
check, and XAMPP served the API successfully. No database reset or recovery flags
were used for this release.
During the follow-up audit, Apache and MySQL were stopped. Both started normally;
the database health check and live configuration endpoint passed again. These
services must remain running when using the local web app or APK.

## Server and installation

Existing servers must run `C:\xampp\php\php.exe scripts\migrate-checklist.php`
before serving this version. The additive migration was applied locally and the
health check confirmed 7 checklist groups and 40 choices. Existing reports were
preserved. Include `public/assets/img/checklist/` when transferring admin-uploaded
checklist images to a different server.

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

This release has automated web route/behavior checks but no live visual browser
sign-off. No Android device or emulator was connected. Real camera capture, GPS reception and permission dialogs,
map-tile network behavior, and installation still need a physical-device check.

An iPhone IPA requires macOS, Xcode, and Apple signing credentials. This Windows
release verifies the shared Flutter code and produces the Android APK only.
Play Store publication also requires a private release/upload signing key; the
current APK retains the existing pilot development certificate.
