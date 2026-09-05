# Appendix H module verification

Verified on September 5, 2026 against the source project, a disposable fresh database, and the XAMPP browser installation.

## Role key and safe interpretation

- **SA** — System Administrator
- **SE** — Scientific Expert
- **CG** — Community Guardian
- **Pass** — implemented, role-guarded, and covered by automated or live acceptance checks

The phrase **Register New Account** needs one security clarification in the manuscript. Guardians may self-register. Expert and administrator accounts are provisioned by an authenticated system administrator under **Users > Create staff account**. Public visitors cannot select or inject a privileged role. In a role matrix based on who performs an action, use these two rows:

| Function | SA | SE | CG |
| --- | :---: | :---: | :---: |
| Register guardian account |  |  | * |
| Provision expert/administrator account | * |  |  |

Do not describe public expert or administrator self-registration as a feature.

## Acceptance matrix

| Module / function | SA | SE | CG | Result | Main implementation evidence |
| --- | :---: | :---: | :---: | :---: | --- |
| User access — register guardian account |  |  | * | Pass | `public/register.php`, `Auth::registerGuardian()`, `public/mobile-api/register.php` |
| User access — provision staff account | * |  |  | Pass | `public/admin/users.php`, `app/Views/admin/users.php` |
| User access — login / secure session | * | * | * | Pass | `public/login.php`, `Auth::attempt()`, session-version revocation, login throttling |
| User access — edit profile | * | * | * | Pass | `public/settings.php`, mobile profile endpoint |
| User access — change password | * | * | * | Pass | `public/settings.php`; current-password validation, rehashing, session-version increment |
| User access — manage roles and permissions | * |  |  | Pass | `public/admin/users.php`; self-change and last-active-admin protections |
| User access — deactivate / delete accounts | * |  |  | Pass | Suspend/reactivate; deletion only for unused suspended accounts so retained evidence is not orphaned |
| Reporting — submit mangrove report |  |  | * | Pass | `public/submit-report.php`, `ReportService::submit()`, Flutter report wizard |
| Reporting — upload field photo |  |  | * | Pass | MIME/content validation, randomized private path, hash-based duplicate rejection, protected `photo.php` delivery |
| Reporting — capture real-time GPS |  |  | * | Pass | Browser geolocation/manual pin and Flutter geolocator; source and accuracy validation |
| Reporting — complete initial health checklist |  |  | * | Pass | Illustrated observations and `HealthClassifier`; the expert validates the computed status |
| Reporting — interactive map | * | * | * | Pass | Leaflet views, Flutter map, `api/clusters.php` |
| Reporting — filter locations / status | * | * | * | Pass | Search, health, species, barangay, and role-scoped map queries |
| Validation — pending queue |  | * |  | Pass | `public/admin/verification.php` |
| Validation — confirm suggestion |  | * |  | Pass | `VerificationService::review()` confirm path |
| Validation — correct health/species |  | * |  | Pass | Atomic correction path with final health, species, rarity, and attention flag |
| Validation — reject with reason |  | * |  | Pass | Empty reasons rejected; valid rejection stores feedback, history, notification, and audit row |
| Validation — coaching / feedback |  | * |  | Pass | Expert feedback displayed to guardian and stored in history |
| Validation — validation history | * | * |  | Pass | Verification queue history, report history, and `verification_logs` |
| Timeline — view generated clusters | * | * | * | Pass | Clusters are assigned automatically after verification and are view-only |
| Timeline — chronological photo evidence | * | * | * | Pass | Cluster timelines; CG sees only their own private evidence while shared entries are redacted |
| Timeline — historical health logs | * | * | * | Pass | Immutable observation snapshots and verified timeline entries |
| Timeline — growth records | * | * | * | Pass | Follow-up parent links, chronological alive counts, health, species, and feedback |
| Analytics — computed survival rates | * |  |  | Pass | Administrator-only overall, cluster, trend, map popup, and mobile fields |
| Analytics — health charts / summaries | * | * |  | Pass | Filtered verified-health distribution and verification trend |
| Analytics — identify high-risk clusters | * | * |  | Pass | At Risk / needs-attention query, table, map, and mobile list |
| Analytics — export PDF report | * |  |  | Pass | Administrator-only **Print / Save PDF** action and print stylesheet |
| Gamification — milestone progress |  |  | * | Pass | `BadgeEngine::progressForUser()` and guardian badge progress UI |
| Gamification — award badges |  |  | * | Pass | Idempotent award after verification with immutable earned snapshots |
| Gamification — digital certificates | * |  | * | Pass | Guardian self-service and administrator certificate link for eligible guardians |
| Gamification — recognition status |  |  | * | Pass | Earned/locked badge states, progress, notifications, certificate gating |
| Audit — automated logs | * |  |  | Pass | Required transactional audit rows for critical mutations plus authentication/access logs |
| Audit — status changes | * |  |  | Pass | User and report status transitions include before/after details |
| Audit — administrative actions | * |  |  | Pass | SA-only filterable `public/admin/audit.php` |

## Wording corrections for the manuscript

Use **Complete Initial Mangrove Health Checklist** instead of **Input Initial Mangrove Health Status**. The guardian records observable facts; the system calculates a suggestion and the scientific expert validates it.

Use **Chronological Photo Evidence (subject to privacy controls)** instead of implying that every guardian can see every private field photo. Scientific experts and administrators may inspect all evidence for official review. A guardian sees their own evidence; another guardian sees a redacted shared cluster event.

Use **Print / Save as PDF** if the implementation must be described precisely. It uses the browser's print-to-PDF facility, as allowed by the project plan; it is not a server-created PDF file.

## Verification commands and results

```powershell
C:\xampp\php\php.exe scripts\healthcheck.php
C:\xampp\php\php.exe tests\run.php
C:\xampp\php\php.exe tests\e2e_release.php
powershell.exe -ExecutionPolicy Bypass -File tests\http_smoke.ps1 `
  -BaseUrl http://127.0.0.1/mangrooves_v2/public

cd mobile\flutter_app
flutter analyze
flutter test
```

Latest recorded results:

- Database/application health check: **OK**
- PHP domain/integration suite: **27 passed, 0 failed**
- Disposable-database HTTP journey: **91 passed, 0 failed**
- Live XAMPP route and access-control smoke suite: **54 passed, 0 failed**
- Flutter analyzer: **No issues found**
- Flutter widget tests: **All tests passed**
- Android release: package `org.mangrooves.mobile`, version `1.1.1+3`, minimum Android API 24, APK Signature Scheme v2 verified

## Honest release boundary

The automated results demonstrate application logic, database transactions, HTTP routes, access control, upload handling, and a buildable Android artifact. Final acceptance on real hardware still requires a short device test for camera, GPS permission, network reachability, and map interaction. An iPhone IPA must be built and signed on macOS with Xcode and an Apple development/distribution identity; Windows can validate the shared Flutter/Dart source but cannot produce or sign the final IPA.
