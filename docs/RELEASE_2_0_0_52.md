# ManGROOVES 2.0.0+52

## Flexible form layout

- Web forms keep readable widths on large screens. Registration is capped at 640 px, report review at 820 px, checklist management at 1040 px, and admin edit dialogs at 720 px. Existing profile, signer, and report form containers are centered.
- Inputs can shrink within their containers. Short numeric/date fields use compact widths on desktop. Checklist points and species IUCN codes are sized for short values. Textareas remain vertically resizable within a bounded height.
- Related admin fields use columns when space allows and stack on narrow screens. Checklist category/question fields give more space to the question; choice editors adapt to available width.
- Tall web edit dialogs scroll inside the viewport. Primary review and checklist save buttons retain comfortable tap targets.
- Android search filters are bounded to 680 px. Profile forms and management sheets use the same width. Checklist editing uses the shared 760 px form width, with matching action alignment; the category list is capped at 1040 px. Phone controls retain their available width.

## Validation

- Browser checks covered registration, profile, checklist, expert applications, report submission details, report review, species editing, site editing, staff creation, and certificate settings at 320, 390, 768, and 1440 px: 40 layouts passed, with no horizontal page overflow or JavaScript errors.
- Desktop checklist and narrow-phone species edit screenshots were visually inspected.
- Flutter analysis passed with no issues. All 106 Flutter tests passed, with one optional test skipped.
- Android release build succeeded for 2.0.0+52. Physical-device testing was not performed.
- No new behavior or database migration is introduced by this layout update. No Git push was performed.

## Published release

- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-944lcey6i-clements-projects-5174d0c3.vercel.app
- Published October 16, 2026. Live JS/CSS and public images match the prepared release; protected API endpoints require authentication and website CORS passed.
- APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- Version: 2.0.0+52; 59,778,388 bytes. Live download size, content type, attachment header, and ETag match the local build.
- SHA-256: `6AE5F8878581B516CF24D72A98D5031F8E5ADD67931C6DFC7D43D59CD288AD07`
