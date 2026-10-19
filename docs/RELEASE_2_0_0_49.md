# ManGROOVES 2.0.0+49

## Expert applications

- Removed the sender-setup panel from web, mobile web, and APK. Email configuration instructions remain in the project documentation.
- Web uses a centered, bounded workspace with two compact card columns on desktop and one on smaller screens. Filters stay compact, and message fields fit their cards and resize vertically.
- Application decisions use **Pending review**, **Approved**, and **Declined**. The administrator's note has a clear **Decline reason** or **Message to applicant** label, followed by reviewer and date. Email state uses a compact status badge instead of a full-width colored strip.
- Pending applications come first, with the oldest submissions first. Reviewed applications follow in order of most recent decision, using registration date for older records without a review timestamp. Both clients receive the same API order.
- Filters and unfinished messages survive filtering and clearing. Email retry refreshes the list while retaining filters. Both web decision buttons remain disabled during confirmation and submission to prevent duplicate review requests.
- APK cards constrain line lengths on tablets, wrap names/status/actions on phones, and show email retry failures in a visible notification near the current scroll position.
- Applicant recipient selection and saved decision notes are unchanged. This release does not send or retry emails automatically.

## Validation

- 92 Node/web tests passed, including ordering, approval/decline validation, filter retention, email retry, and sender-panel removal.
- 78 isolated API integration checks passed using PostgreSQL/PGlite with Auth, Storage, and mail test doubles. Edge API type-check passed.
- Targeted Flutter administration tests passed, including approval, required decline reason, failure/retry, and long content at 320/1024-pixel widths with doubled text size.
- Browser checks at 320, 390, 768, and 1440 pixels passed: five sample application cards, bounded widths, compact email badges, filters, and draft retention. No horizontal overflow or JavaScript exceptions.
- Full Flutter analysis passed. All 105 Flutter tests passed, with one existing optional skip. Release APK 2.0.0+49 built successfully.

No production application records were changed or deleted, and no real applicant emails were sent by the release process.

## Published verification — October 16, 2026

- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-8dqrb981s-clements-projects-5174d0c3.vercel.app
- APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- Published homepage images and JavaScript/CSS hashes match the prepared website. Protected routes, including Expert applications, require authentication. Upload CORS permits the production origin.
- APK version: `2.0.0+49`; size: 59,778,384 bytes. Remote content type, attachment header, length, and ETag match the local APK. The local SHA-256 matches release metadata and the published checksum file.
- SHA-256: `65500499C8ECF9CDEA08F641071962F37449C1DEA41D4BF55C6D922E9AB0F860`.
- Existing SMTP secret names remain configured after deployment; their values were not displayed or modified. Real inbox receipt was not tested.
- No Git push was performed. Physical Android hardware was not tested.
