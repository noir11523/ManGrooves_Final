# ManGROOVES 2.0.0+54

## App usability and shared wording

- Species and Sites now use clear selected tabs, separated cards, bounded tablet widths, wrapped actions, and labeled information. Search and tab switching preserve the species filter. The species cards show local, common and scientific names in a consistent order, followed by roots, leaves and bark.
- Sites distinguish shared/personal visibility from active/archived/location status. “Set map location” and “Needs map location” replace the ambiguous “Set pin” and “Needs pin” on both platforms. A missing location still prevents saving a site for reports.
- Account has a centered avatar, separate name and role, spaced fields, and a gap between Change password and Sign out. A failed sign-out shows a retry message and releases the button. Password fields and errors have consistent spacing.
- Observation pictures open a bounded, zoomable preview with the bold name below the image and separate Close and Select actions. Closing does not change an answer. Selecting an already selected option in the preview does not deselect it. Each card also has View photo and Select/Selected controls. Multiple-choice, mutually exclusive answers, conflict handling, draft saving and final report confirmation are preserved.
- The root, leaf and bark category names match the website's bilingual names and wrap on narrow screens. The bottom navigation labels the report camera action “Submit”.
- Users, Manage badges, Expert applications and Review history have card gaps. Catalog filters use Filter and Reset. Shared headings use Review reports, Species and Sites, Manage badges and Audit log where the corresponding module exists.

## Android identity

- Replaced the default Flutter launcher artwork with the existing ManGROOVES mangrove mark.
- Includes five legacy icon densities, Android adaptive icons and Android 13 themed monochrome icons. The adaptive foreground keeps the mark inside its safe area. The round icon uses the same adaptive resource.
- Regenerate from the website SVG with `node scripts/generate-android-icons.mjs` (requires local Chrome).

## Verification

- Targeted observation and report-flow tests verify Close/Select, selected-answer preservation, exclusive choices, cross-category conflicts, trait selection, draft restoration and final submission payloads.
- Responsive checks cover small phones, enlarged text, landscape previews and tablets. Catalog tests exercise search, retained filters, selected tabs, missing-pin validation, archive/restore and cancelled deletion.
- Website form/page tests and 40 browser layout scenarios passed after the catalog wording changes.
- Flutter analysis passed with no issues. The complete suite passed **116 tests**, with one optional LAN integration test skipped.
- Nine focused phone/landscape/account checks passed, including two visual-capture scenarios at 390 px and 320 px with 1.6x text. Ten Account, Change password, observation-card and preview captures were generated; final account, password and preview screens were visually reviewed.
- Four catalog checks also passed with Android fonts loaded for screenshots. Species and Sites captures were generated at 320, 390 and 900 px; narrow-phone spacing, selected tabs, readable labels and site actions were visually reviewed.
- Android release build succeeded. Android package inspection confirms `org.mangrooves.mobile`, version code `54`, label `ManGROOVES`, and an adaptive icon containing background, foreground and monochrome resources.

No database migration or Git push is required. Camera/GPS hardware behavior and email delivery are not established by widget tests; no physical Android device is connected for this release.

## Build artifact

- Version: `2.0.0+54`.
- SHA-256: `A69BBB86F23F1EDA51DEEF4E577B436553462DA6BD57E4F636F96D6DB411C83E`.
- Local file: `mobile/flutter_app/dist/ManGROOVES-Supabase.apk`.

## Published and checked

- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-l0s1o5bs3-clements-projects-5174d0c3.vercel.app
- APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- Download size: 59,865,832 bytes.
- Live website JavaScript, CSS, map code and public images match the prepared assets. Protected API endpoints require authentication, and website CORS checks passed.
- APK version metadata, local SHA-256, download size, attachment/content-type headers and live ETag match the new build. These live checks were read-only and sent no email.
