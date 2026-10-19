# Web and Android verification — October 18, 2026

The deployed Supabase/PHP website and Android app were checked together. All completed automated suites pass. This is evidence for the workflows below, not a guarantee that every device, network or external provider will behave identically.

## Findings and fixes

- Removed the web page's fixed 320 px minimum width. A 320 px browser window with a vertical scrollbar has only 305 px available, so the old rule caused horizontal scrolling. The issue was reproduced before the change; all 40 form/dialog scenarios now fit the actual document client width at 320, 390, 768 and 1440 px. The applications screen was inspected visually after the fix.
- Updated the Deno smoke test's sample database with the current staff-report sequence metadata. Its old fixture failed before reaching PDF generation because it lacked transaction support for the numbering migration. The runtime test now reaches and verifies a successful PDF response, its content type and PDF header. Production application behavior did not need changing for this failure.

## Completed checks

| Area | Result |
| --- | --- |
| Shared logic and web UI tests | 97 passed |
| PostgreSQL/API workflow integration | 81 passed |
| PHP website routes, sessions and browser adapters | 22 passed |
| Existing location/checklist JavaScript tests | 49 passed |
| Flutter analyzer | No issues |
| Flutter tests | 108 passed; one optional legacy LAN-discovery test skipped |
| Deno API type check and HTTP runtime smoke test | Passed |
| Chrome form/dialog layout checks | 40 passed after the width fix |
| Chrome map pin and timeline checks | 8 passed |
| Prepared website build | Passed |

The integration tests use an isolated local PostgreSQL engine (PGlite). Authentication, storage, and email providers are test doubles; no applicant emails or production report submissions were created by these tests.

Coverage includes registration/code validation, expert approval and decline reasons, applicant email addressing and retries, password recovery and visibility controls, sessions and role restrictions, report drafts and uploads, duplicate-photo protection, checklist scoring, report review and conflicts, searches and filters, dashboard counts, follow-ups, maps and selected-site timelines, site and species management, certificates/PDFs, and account administration. Web button interactions and Flutter widget navigation are exercised by their respective suites.

## Production checks

- Website and APK configuration point to the same Supabase project.
- Public API identity, barangay data and guide artwork respond successfully. Protected endpoints reject anonymous requests and the website origin passes CORS checks.
- Read-only dashboard/list calculations matched for all 31 active accounts. Staff totals remain 3 verified, 2 pending, 0 rejected, 1 verified report needing attention, and 2 visible pinned sites. Review queues exclude the reviewer's own submissions, so those totals may differ legitimately by account.
- The live website assets and APK download were compared with the prepared release. Android remains **2.0.0+53**, 59,778,384 bytes, SHA-256 `46E9B7E7A99CA907FBB14E15A3C8444E83EC3008F94DEF0DF3DAF72EF1009F65`.

## Limits and remaining manual checks

- No Android phone or emulator was connected (`adb devices -l` returned no devices). Physical camera/gallery permissions, actual GPS accuracy, field network behavior and Android installation were not tested on hardware in this audit.
- No new registration or decision email was sent. The tests verify the registered applicant address, sender formatting, decision content, failure handling and retry protection; current inbox placement and OTP arrival still require a real inbox check.
- The optional LAN-discovery test concerns the older laptop-hosted backend and is disabled for this Supabase audit. Legacy MySQL end-to-end tests were not run against the live cloud project.
- Test and browser evidence is saved under `tmp/audit-20261018-*`; browser fixtures are local. No production records were deleted or edited by the audit.

## Publication

The narrow-screen stylesheet fix is published at https://mangrooves-php.vercel.app. Deployment: https://mangrooves-c4y5e3hoq-clements-projects-5174d0c3.vercel.app. The publish workflow's public-page, APK and website CORS checks passed. Android source and APK version are unchanged; no new APK installation is needed for this website fix. The runtime-test update is local test coverage.

The final post-publication check also passed: the live shared stylesheet matches the fix, bundled web/map assets match the prepared website, protected API routes require authentication, and the APK download still matches version 2.0.0+53 and its recorded hash/size.
