# Release 2.0.0+59

## Changes

- Every new report waits for independent staff review. Removed the automatic-verification filter, unreachable cloud submission branches, and the older local PHP shortcut. Historical verification records remain, labelled Legacy verification.
- Mangrove timeline now has visible Health history, Mangrove counts and verified visits, with latest-result summaries, section navigation and explanatory empty states. Unknown counts remain missing rather than zero. Old growth links open Mangrove counts. Counts describe living mangroves surveyed, not tree height.
- Web map pins expose escaped hover and keyboard summaries; click/tap opens details. Instant zoom avoids a late animation error when leaving a map. Report map adds report search, reset, recentering and an accessible list for overlapping pins. Android has matching filters and controls, with explicit pagination.
- Explore filters shared active verified sites by species, location and health, with synchronized results and truthful empty states. Barangay names include their municipality. Android now includes Explore in its insights menu. Guardian timeline restrictions remain enforced.
- Species edits identification traits; Sites adds and pins locations. Site filters distinguish active, archived and missing-map locations. Site editors use the searchable Cebu barangay selector.
- Users displays each earned badge by name, then verified and total submitted reports. Badge milestones are cumulative. Staff Pending dashboard cards use the independent review queue and its count; guardians keep their own pending reports.
- Retained the 29 real reference images, including 13 optimized photographs from the supplied Drive. Photo credits are removed from navigation; the attribution resource remains for licensed fallback photographs.

## Validation and publication

- 111 web/backend regression tests, 81 Supabase API integration checks and 23 PHP hosting checks passed.
- Flutter analysis passed with no issues; 119 tests passed. The existing optional LAN-discovery test was skipped for this cloud release.
- Supabase Edge Function type-check passed.
- Headless Chrome checked 15 layouts at 320, 390 and 1280 pixels, including map filters/popups, timelines, users and species. No page overflow or browser exceptions remained.
- 53 legacy PHP/MySQL integration checks passed against an isolated temporary localhost database, including the Healthy-report pending-review rule. The temporary server was shut down afterward.

The existing Drive photo catalog checks confirm individual real JPEGs and their checksums.

Existing reports, accounts, badges and review history are preserved. Install the new APK to update the native app; refreshing the website updates the web interface.

## Android artifact

- Package `org.mangrooves.mobile`, version `2.0.0+59`, display name ManGROOVES.
- 60,113,079 bytes; APK Signature Scheme v2 verified. Android SDK 24 minimum, target 36.
- SHA-256: `04EC4CA128E5F7A77C519DE2F03A2660B325C06EA3EEE7A8E67DE98872969C92`.

Automated checks do not replace physical-phone field testing.

## Publication

Published October 21, 2026 (Asia/Manila) to the [existing website](https://mangrooves-php.vercel.app) and shared Supabase API. [Deployment](https://mangrooves-mi3b3jm1d-clements-projects-5174d0c3.vercel.app). The publisher verified public PHP pages, upload origins and the APK download headers and hash file.

Install the [Android APK](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) to receive the native interface changes. No database reset is needed.
