# ManGROOVES 2.0.0+53

## Map pin details and timeline

- Tapping a cluster pin in the app opens a scrollable site panel with its name, cluster code, barangay, latest health and available species names. View timeline opens that selected cluster's health history; View reports and Growth timeline remain available.
- The app panel has an explicit Close button and bounded width/height, with darker health colors for readable labels. Long names and larger text remain usable on a narrow phone.
- Web cluster popups show the cluster code, barangay, health and available species names. Scientific names stay italic even when no local/common name is available.
- Dashboard and cloud-page popups fit narrow maps and pan clear of the zoom controls. A click opens the popup; timeline links retain the selected cluster ID and health/growth view.

## Validation

- 13 targeted web tests passed, including real Leaflet pin-click events, PHP dashboard popup details, selected-site timeline URLs, report-map filters and error recovery.
- 6 targeted Flutter tests passed, including the pin-to-timeline flow on a 320 px phone at normal and 1.6x text size.
- Full Flutter analysis passed with no issues; 108 tests passed with one optional test skipped.
- Eight Chrome checks passed across dashboard/history maps at 320, 390, 768 and 1440 px: actual pin clicks opened the correct details, timeline URLs kept the selected site, popups stayed on-screen and clear of zoom buttons, and no JavaScript errors occurred. Final narrow-phone and desktop screenshots were inspected.
- Browser checks use real map controls and local site/tile fixtures; they do not alter live records or send messages. Physical Android hardware testing was not performed.

No database migration or Git push is required.

## Published release

- Android release build succeeded for 2.0.0+53.
- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-e3d49d2lx-clements-projects-5174d0c3.vercel.app
- APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- Download size: 59,778,384 bytes.
- SHA-256: `46E9B7E7A99CA907FBB14E15A3C8444E83EC3008F94DEF0DF3DAF72EF1009F65`
- Live map JavaScript and bundled web assets match the tested release. APK content type, attachment header, size and ETag match the local build. Protected API endpoints and website CORS checks passed.
