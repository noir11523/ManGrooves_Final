# Release 2.0.0+64 — published November 5, 2026

Report location search now combines the barangay directory, map-provider results and a sourced Cebu street reference for Tagunol. Nearby matches rank first; unrelated spelling matches such as Tabunok are excluded. Barangay matches no longer hide matching landmarks. Search coverage depends on the provider and does not equal the Google Maps catalog. A Google geocoding key, when configured on the server, enables the existing optional provider.

The location step has one search field and a read-only selected address. GPS clears the previous search and ordinary site selection, then updates the pin, address and barangay. Moving the pin refreshes its address; delayed replies cannot overwrite a newer location. A requested follow-up remains tied to its original site. Searching without choosing a result does not rename the saved pin.

Traits uses Previous and Next without a category counter. Review edits fit narrow Android screens, and long site names wrap within the dropdown.

Every submission starts Pending. Only verification adds a new site to the selectable saved list. The API also rejects older clients trying to select an unverified site. Dashboard and timeline site lists use the same verified-site rule. Total Verified Reports includes Healthy, Stressed, At Risk and Unknown. Needs Attention includes only verified Stressed, At Risk or Unknown reports. Rejection and repeated verification do not inflate totals.

The existing nationwide directory work is included, with stable Cebu IDs and explicit province/city labels. See [geography setup](PHILIPPINES_GEOGRAPHY.md) for the required national boundary migration and import. Cebu lookup continues using its bundled detailed boundaries, including when the national lookup is not installed. No historical coordinates or account home barangays are rewritten.

Tagunol source: [DOTC Cebu street reference archived by Transitland](https://www.transit.land/explore/stops/s-wcb4dc40rr-nodata~tagunolstreet). It supplies a street reference point; the reporter must check the actual mangrove pin.

The website, shared API and Android download are published at [ManGROOVES](https://mangrooves-php.vercel.app). Install the [updated Android APK](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) to use the new app screens. The national boundary migration and all 41,356 available polygons are installed.

Validation: 138 web/backend tests, 86 isolated PostgreSQL/API checks and 127 Flutter tests passed. One optional local-network Flutter test was skipped. Flutter analysis and Deno's Edge API check passed. Chrome checked Explore and report location at 320, 390 and 1280 pixels, including GPS clearing the selected site, address refresh after moving the pin, search preserving the existing pin until selection, and selecting Tagunol without horizontal overflow or runtime exceptions. GPS checks use simulated positions; physical-device GPS accuracy remains dependent on the device and signal.

The initial API upload exceeded the provider's request limit. Directory and boundary files now use lossless compression; round-trip checks confirmed every record and coordinate was preserved. The imported 41,356 boundary geometries are valid, and client roles cannot modify the lookup data.

The packaged PHP website built successfully and all 25 hosting checks passed. A live check found the full address directory exceeded the website host's response limit; large JSON responses now use negotiated gzip. Registration and profile checks preserve all 42,046 directory entries. Live Chrome at 390 pixels confirmed successful directory loading, verified-only Explore data, no horizontal overflow and no script exceptions. The publication command now checks public API data as well as HTML pages.

Read-only checks against production confirmed site counters match verified reports and pending reports remain outside Needs Attention and public sites. No user reports or account addresses were changed by these checks.

The complete published Android download matches the tested APK. Package `org.mangrooves.mobile`, version name `2.0.0`, version code `64`; APK size 60,342,431 bytes. Android signature verification passed. SHA-256: `17A56520C553768CD8684F11F29D783623B839D73FB76F8DFAE559C3A1762225`.
