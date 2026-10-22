# Release 2.0.0+60

Long map hover labels could collapse to a column one character wide. The browser regression reproduced a 36-pixel-wide, 1,548-pixel-tall label. Labels now have an intrinsic width and a map-sized maximum, wrap normally, and stay inside map edges clear of the zoom controls. Opening details closes the hover label.

The fix covers dashboard maps, Explore and Report map in the PHP website and standalone web client. Dashboard script URLs include a content hash so browsers load the updated behavior. Full names remain available in the details popup, with keyboard and pointer access preserved.

Report details use **Suggested health** for unverified reports and **Pending review** for the review status. The Android panel has a Close button, comfortable spacing and a bounded scrollable layout for long names and enlarged text. **Mangrove site map** is used consistently in the web and app. Site locations in the app include their city or municipality when available.

Explore now contains filters, a map and matching sites. Removed Manage sites, Show all matching pins and the duplicate Species reference; species and site editing remains in Species and Sites. Removed the extra recenter button from Report map; filtering and clearing a location still fit the map automatically.

Mangrove timeline shows Health history and Mangrove counts together without repeated section buttons. Mangrove counts is the former Growth timeline: it plots living-mangrove counts from verified visits, not tree height. Missing counts stay missing, and zero stays zero.

Administrators can **Delete user** after confirming the named account. Self-deletion is blocked. The account and its expert application are removed; report and review snapshots remain. Auth deletion failure restores the account's previous status. Supabase Auth deletions also remove the corresponding profile through a database trigger. Directory reads exclude profiles whose Auth account is already absent, without purging existing orphan data. Migration `202610220001_user_deletion_sync.sql` adds the trigger and a service-role-only account-existence function. No current accounts are deleted by the migration.

## Validation

- 114 web/backend regression tests passed, including cancellation/retry and isolated database deletion tests.
- 82 local Supabase API integration checks passed, including role restrictions, self-deletion rejection, preserved historical reports and hidden orphan profiles.
- 23 PHP hosting and browser integration checks passed.
- 28 Chrome map layouts cover 320, 390, 768 and 1280 pixels, embedded and standalone clients, PHP dashboard maps, long names, keyboard/click details and all four map edges.
- 15 additional responsive page checks cover Users, timeline, Report map, Explore and Species at 320, 390 and 1280 pixels.
- App map tests cover long site names at 320 × 640 with normal and 1.6× text sizes, readable report details and closing the panel.
- Flutter analysis found no issues; 122 app tests passed, with one optional local-network test skipped.
- Supabase Edge API type-check passed. The live account-sync trigger and server-only function permissions were verified read-only.

The browser regression is repeatable with `npm run test:map-layout` from `vercel`. Set `CHROME_PATH` when Chrome is installed elsewhere. It uses local fixture data and creates no accounts or reports.

The full Flutter suite's ID-photo test now awaits its asynchronous file read instead of relying on a 150 ms delay that failed under load.

## Android artifact

- Package `org.mangrooves.mobile`, version `2.0.0+60`.
- 60,112,995 bytes; APK Signature Scheme v2 verified.
- SHA-256: `5DC9976FE99E1FAA4F5F587224DBBADFAD5B80D46415744A2357A00DBB451717`.

Refresh the website for the new interface. Install the updated [Android APK](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) for native app changes. Existing reports and review history are preserved. Physical-phone field testing remains useful beyond automated checks.
