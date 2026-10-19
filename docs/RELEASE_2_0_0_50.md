# ManGROOVES 2.0.0+50

## Checklist search and pictures

- Search appears immediately below the Health checklist heading on web and at the top of the native screen. It finds category names, questions, individual choices, and species features; matching is case-insensitive and ignores extra whitespace.
- Web search opens matching categories and highlights matching choice cards. Clearing restores the prior expanded sections without destroying unsaved labels or selected upload files.
- Health categories appear first, followed by root type, leaf shape, and bark texture, matching the report form. The separate species-picture parent accordion was removed.
- Picture editors use bold names below images and responsive cards. Web search and fields fit the available width.
- Report choices have centered bold labels below their pictures. Enlarged web images use a content-sized dialog with the caption beneath the image, followed by Close and Select. Native enlarged images retain zoom and now show the bold caption underneath.
- Report category tabs scroll the selected category into view.

## Validation

- 93 Node/web tests passed; the final form-only rerun passed all 32 tests after scoping the checklist styles.
- Flutter analysis passed, and 106 Flutter tests passed with one existing optional skip. The new native test covers choice and trait searches, empty results, and Clear.
- Browser checks passed at 320, 390, 768, and 1440 pixels: ten ordered categories, live trait search, captions below pictures, visible dialog controls, no horizontal overflow, and no JavaScript exceptions.
- Browser screenshots were inspected for desktop checklist and phone search/photo preview.

This release does not change report scoring, saved checklist data, email recipients, or database schema. Physical Android hardware was not tested. No Git push was performed.

## Published verification — October 16, 2026

- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-90th4lekb-clements-projects-5174d0c3.vercel.app
- APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- APK version `2.0.0+50`, size 59,778,388 bytes; SHA-256 `A894A93F7C7715B100B840B03E9C8EE3A46BE9474D0534E8C7F7272E6CA76598`.
- Live JavaScript/CSS match the prepared site. Protected endpoints require authentication, and production CORS checks pass.
- APK download headers, length, ETag, and release checksum match the local build.
