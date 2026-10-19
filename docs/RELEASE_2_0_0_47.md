# ManGROOVES 2.0.0+47

## Species editor

- Add/Edit fields now start with **Local name → Common name → Scientific name** on desktop web, mobile web, and APK.
- Existing species have a **Delete species** action in the editor, with confirmation. Cancel keeps unsaved edits; errors keep the editor open for retry.
- Deletion removes the species from catalogs and future choices while retaining its reference for historical report names. Reports, photos, and review records are kept.
- The server restricts deletion to active administrators and experts. Stale updates cannot restore a deleted species. Successful deletion creates an audit record.
- The web dialog uses tighter field spacing and aligned action buttons. No schema migration is needed.

## Mobile readability

- Dashboard follow-up requests no longer put the action button in the same narrow row as a long address. Site and note text get the full card width, with actions below.
- A warm amber background identifies follow-up requests. Long previews are bounded; **View report** opens the complete details, and **Follow up** starts the requested visit.
- Report status tags use dark text on pale green, amber, red, and blue backgrounds. Selected report filters use white text on forest green. These text/background pairs have contrast ratios from 6.82:1 to 8.06:1.

## Expert-decision email

- Added a Resend HTTPS adapter using server-only `RESEND_API_KEY` and `MAIL_FROM` secrets, plus a stable idempotency key for retries.
- Existing SMTP support remains available. The default port is now 465, and blocked Edge Function ports 25 and 587 are rejected. This corrects the earlier 587 default.
- Web and APK explain that decisions remain saved while an email sender is disconnected. Admins can expand setup instructions and retry after configuration. Web delivery status and Retry email now have their own spaced action area.
- **Activation remains external:** neither Resend nor SMTP sender credentials were configured when checked. The owner must verify a sending domain and add the secrets. No live applicant emails were sent during this release. [Setup instructions](EXPERT_DECISION_EMAIL.md).

## Validation

- 90 Node/web tests and 78 API integration checks passed. API checks use local PostgreSQL/PGlite with explicit Auth, Storage, and email test doubles.
- Edge API type-check passed. Flutter analysis passed; 103 Flutter tests passed with one existing optional skip.
- Follow-up layout tests use the actual app theme at 320/390-pixel widths and normal/doubled text size. They verify usable text width and working actions below the address.
- Final browser layout checks passed across 48 page/viewport combinations, four species-editor widths, and three site dialogs, with no horizontal overflow or JavaScript errors.
- A repeated simulated-camera initialization timed out during concurrent Android tests. The isolated camera check passed after compilation, including live preview, capture, and stopping the camera track; camera implementation code was unchanged.
- Real-device hardware and real inbox delivery were not tested. No production reports or species were deleted by the release process.

Website: https://mangrooves-php.vercel.app

APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk

## Published verification — October 15, 2026

- Website and Edge API published. Public pages render, and live homepage images and JavaScript/CSS hashes match the prepared files.
- Protected API routes return 401 without sign-in. Upload CORS allows the live website origin.
- Deployment: https://mangrooves-680s2kvpx-clements-projects-5174d0c3.vercel.app
- APK version: `2.0.0+47`; size: 59,762,000 bytes. Remote HEAD length, content type, attachment disposition, and ETag match the local APK. Local SHA-256 matches its metadata and the published checksum file.
- SHA-256: `918CDCA92E9EBE916C895315DBE019891B6E693EF7699CC5341F48359C61B329`.
- No Git push was performed. Email sender activation and a real inbox check remain pending the owner's credentials and domain verification.
