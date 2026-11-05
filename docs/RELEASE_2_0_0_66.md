# Release 2.0.0+66 — published November 5, 2026

New sites now accept **Unable to count**. The old saved-site requirement has been removed from the website, Android app and server. A typed location can continue from Details to Location, where the reporter selects a search result, uses GPS or places the exact pin.

The count box hides while Unable to count is selected and shows **Count not recorded.** Unchecking it restores the entered number. Search selections, GPS, pin movement, site changes, Back and saved drafts preserve the unknown-count choice. The submitted value is unknown, never an invented zero or a previously typed count.

Reports still start Pending. A new site becomes a saved choice only after verification. The timeline retains an unknown count when a later verified visit adds a measured count.

Regression checks cover typing a new location, selecting it, moving the pin, going Back, restoring a draft, review and final submission. The isolated API test submits an uncounted new site, verifies it and adds a later counted visit. No production test reports are created.

Validation: 138 web/backend tests, 88 isolated PostgreSQL/API checks, 129 Flutter tests and 25 packaged website checks passed (380 total). One optional local-network Flutter test was skipped. The first PHP test server readiness check failed; a fresh test run passed all 25 hosting checks. Flutter analysis and the Deno Edge API check passed. Chrome checked 21 responsive layouts at 320, 390 and 1280 pixels, including Continue with a new searched site and unknown count, Back, GPS and pin movement. GPS checks use simulated positions.

The signed APK is `org.mangrooves.mobile`, version `2.0.0+66`, 60,342,431 bytes. SHA-256: `DA1EB21FC27CD3BF5310AEC8EEEF50B1C98C972D7F68F020909D4B683C64E732`.

The [website](https://mangrooves-php.vercel.app), shared API and [Android download](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) are published. Live assets and the full downloaded APK match the tested package. The old saved-site error is absent from the published browser code. Public configuration, verified-site responses, private-route protection and upload CORS checks passed.
