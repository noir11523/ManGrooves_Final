# Release 2.0.0+67 — published November 6, 2026

Submit report is a direct entry below Dashboard for Coastal Guardians and Experts. It appears once in the desktop sidebar, and the Android menu gives it the same position. Existing mobile Submit shortcuts remain available. Administrator permissions are unchanged.

Registration, profile settings and staff address forms use matching Province, City / municipality and Barangay dropdowns. The barangay list follows the selected city; changing the city clears an incompatible barangay without clearing the other address fields. Barangay IDs distinguish places with the same name.

Total Verified Reports is a centered card above the supporting totals on the dashboard and analytics. The layouts adapt to phone, tablet and desktop widths. Analytics labels its separate site count Sites needing attention. Healthy sites with outstanding follow-up requests stay in follow-up tracking without inflating that condition-based count. All verified conditions, including At Risk and Unknown, count toward the verified report total; pending and rejected reports do not.

The Android sign-in/header bitmap and older launcher icons were cropped. They are regenerated from the existing mangrove SVG, along with the web app icons. The generator now rasterizes the complete SVG viewBox to a canvas, checks the visible trunk, and writes binary PNG data safely.

Validation: 139 shared/web tests, 88 isolated PostgreSQL/API checks, 129 Flutter tests and 25 packaged website checks passed (381 total). One optional local-network Flutter test was skipped. Flutter analysis, the Deno API check and PHP syntax checks passed. Chrome checked 27 layouts at 320, 390 and 1280 pixels without page overflow or browser exceptions; a further profile inspection checked the matching city/barangay dropdowns together. The signed-in role workflows and submissions use isolated fixtures, and GPS checks use simulated positions; no production reports were created and no physical-phone test is claimed.

The signed APK is `org.mangrooves.mobile`, version `2.0.0+67`, 60,352,579 bytes. SHA-256: `7BE3753D042694817AB0FF81007C4250861C8FD326572F9B9C12553750572EAA`. Its signing certificate matches the preceding release, and the image inside the packaged app matches the corrected source icon.

The [website](https://mangrooves-php.vercel.app), shared API and [Android download](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) are published. Live JavaScript, styles and icon files match the checked package, and the complete downloaded APK matches the signed local release. Public configuration, verified-site geography, private-route protection and exact-origin CORS checks passed. Refresh the website and install the new APK to use the updated interface.
