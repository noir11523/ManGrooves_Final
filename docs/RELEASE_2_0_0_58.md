# Release 2.0.0+58

## Changes

- Replaced packaged checklist and trait defaults with 29 real photographs, including 13 optimized Drive images. No active choice uses AI or a collage. Labels and selection circles remain; photo credits moved to a separate page. Enlarged previews retain Close and Select/Deselect.
- Observation navigation advances through categories in order, returns to the previous category, scrolls to the active question and reveals missing answers before review. Browser/Android Back retains draft details, location and photos. The final button says Review report.
- Searchable directory of 1,203 barangays across Cebu, including Cebu City, Mandaue and Lapu-Lapu. Names include their city/municipality. Required mobile number and one address line are shared by registration and profile editing. Inayawan retains ID 1; no SQL reset or bulk insert is required.
- Expert registration and staff creation use private ID photos. Admin approval/decline and legacy applications remain supported. Specific application links open one application and its decision reason.
- Staff navigation places Review reports before Report history, which contains Reports and Review activity. Guardians retain their own reports. Mangrove timeline shows both verified health and living-mangrove counts with role-scoped details. Clusters opens the scoped cluster list on web and Android.
- Confirm system suggestion accepts the original result without correction inputs, including Unknown, which remains flagged for attention. Correction and rejection have separate requirements.
- Users shows badges, badge-tier filters, active role counts and contact/address details. Pending/declined applicants and suspended experts are excluded from the default active Expert role filter. Explicit status filters still allow administration of suspended accounts.
- The Android sign-in and account header use the existing ManGROOVES icon; the launcher retains the system's mangrove mark.

## Validation

- 105 Node/backend/web regression tests and 81 API integration checks passed, including private ID access, fixed review behavior and preserved role restrictions.
- 23 Vercel/PHP checks passed against the release package, including signed-in role navigation, the Clusters link and multipart registration before sign-in.
- Supabase Edge Function type-check passed.
- Flutter analysis passed; 118 tests passed with the existing optional local-LAN discovery test skipped. The full suite includes keyboard-visible barangay search, small-phone layouts, draft restoration, selection/deselection and report confirmation.
- Headless Chrome checked all 10 observation categories at 320, 390 and 1280 px, preview dialogs, browser Back, checklist editors, profiles, user lists, report history and merged timelines. No horizontal page overflow or browser exceptions were observed.
- All 29 hosted photo checksums matched. Installation preserved labels, scores and species records, and a repeat installation would make no changes. Backups are in ignored `tmp/reference-photo-backups`.

## Android artifact

- Package: `org.mangrooves.mobile`; version `2.0.0`, code `58`; display name `ManGROOVES`.
- Minimum Android SDK 24, target SDK 36. APK Signature Scheme v2 verified.
- File: `mobile/flutter_app/dist/ManGROOVES-Supabase.apk`; 60,014,623 bytes.
- SHA-256: `16060F1C5EE7D091BD285932414B443F01311050715BB052A192E3DC55533A93`.

Automated checks and browser previews do not replace physical-phone field testing or expert botanical validation. The optional LAN discovery test is intentionally disabled for this cloud release.

## Publication

Published October 21, 2026 (Asia/Manila) to the [existing Vercel website](https://mangrooves-php.vercel.app) and its shared Supabase API. Deployment: [release 58](https://mangrooves-lhlaoayfy-clements-projects-5174d0c3.vercel.app).

Live checks verified all 29 website photo checksums, the new UI bundle, the credits page and all 1,203 barangays. The publisher also checked public PHP pages and the allowed upload origins. Existing accounts and report/activity records were preserved.

Install the [updated Android APK](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) to receive the native app changes. Refresh the website for its update. New expert applications use ID photos; older installed app versions that submit only ID codes must be updated before registering an expert.
