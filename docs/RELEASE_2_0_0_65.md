# Release 2.0.0+65 — published November 5, 2026

Selecting **New site** in Details now shows **Search a barangay or landmark**. The same search text appears in the Location box and stays there when moving Back or restoring a draft. Choosing a result sets the pin and fills the box with its address. The pin-based **Barangay:** line remains below it.

GPS and moving the pin update the address in the box. Delayed address responses cannot overwrite a newer search. Typing alone preserves the saved pin until a result is chosen. Switching from a saved site to New site clears the previous site's location. Requested follow-up visits retain their original site restrictions.

Visible labels now use **Condition** throughout reports, review screens, maps, timelines, analytics, checklists and PDF exports on the website and Android app. **Healthy** remains a condition result. Stored fields and existing reports retain their compatible data format.

Validation: 138 web/backend tests, 86 isolated PostgreSQL/API checks, 128 Flutter tests and 25 hosting checks passed (377 total). One optional local-network Flutter test was skipped. Flutter analysis, the Deno Edge API check and PHP syntax checks passed. Chrome checked 21 page layouts at 320, 390 and 1280 pixels, including the synchronized search, GPS refresh, pin movement and Back navigation, without page overflow or script exceptions. GPS tests use simulated positions; physical-device reception was not tested.

Android package: `org.mangrooves.mobile`, version name `2.0.0`, version code `65`. Signature verification passed. APK size: 60,342,431 bytes. SHA-256: `EDF2C83FAAE814BC34B3C202E25C7E4B3E5FFD028831D884918B4BB650786FDD`.

The [website](https://mangrooves-php.vercel.app), shared API and [Android APK](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) are published. Live website assets and the complete downloaded APK match the tested package. Public directory and verified-site responses, private-route protection and website upload CORS checks passed. No reports or user accounts were changed during publication checks.
