# ManGROOVES 2.0.0+56

Observation photo previews now show **Select** for an unanswered choice and **Deselect** for a selected choice. Both the preview action and the circle below the bold label toggle the answer. Closing the preview leaves the answer unchanged.

This applies to single-choice health questions, multiple-choice observations, and the roots, leaves and bark choices. Selecting a different answer still replaces the current answer for single-choice questions. The existing special-choice and conflicting-observation rules remain in effect. Required questions and species features must be answered before opening the report review.

The larger photo preview, pinch-to-zoom, and side-by-side Close and Select/Deselect buttons remain available. Android users must install the updated APK. No database migration is needed.

The 12 targeted observation and report-flow tests passed. They cover selecting and deselecting through the preview, repeated circle taps, closing without changes, single-choice and multiple-choice answers, species features, required-answer validation, conflicting observations, and the existing draft/review/submission flow. Two additional visual checks passed at 390px and 320px widths, including enlarged text; the selected card and preview were visually inspected.

Flutter analysis passed with no issues. The full suite passed 116 tests, with one optional LAN test skipped.

Android release build succeeded for `2.0.0+56`. Package inspection confirms version code 56 and the ManGROOVES label.

- Local APK: `mobile/flutter_app/dist/ManGROOVES-Supabase.apk`.
- Size: 59,865,852 bytes.
- SHA-256: `FA4F832B111488A55E59A7DDCF01D42926096D69D1136B0F4B32C9D43E286061`.

Published and verified:

- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-clzezci9f-clements-projects-5174d0c3.vercel.app
- APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- The live download size and ETag match the local APK. Local version metadata and SHA-256 match the tested build.
- Website assets, protected API endpoints and CORS checks passed. Live checks were read-only. No physical-device hardware testing was performed for this change.

Source synchronization checks on October 19, 2026: 97 shared/backend/web tests, 81 local PostgreSQL/API workflow checks, and 22 website/PHP packaging checks passed. The GitHub source update includes the current application code, tests, launcher assets and documentation. Private configuration, account/report backups, local photos and generated analytics exports are excluded from the commit. The README now describes independent review of all new reports and the current report steps.
