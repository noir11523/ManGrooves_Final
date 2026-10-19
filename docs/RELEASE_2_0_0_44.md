# Release 2.0.0+44

Compact analytics and larger graphs, October 11, 2026.

- Smaller analytics numbers and reduced metric-card padding. Guardian totals
  occupy one row on desktop; narrow phones retain two columns. Staff survival
  remains available without duplicating the verified report total.
- Browser chart height increases from 270 px to 350 px on larger screens and
  320 px on phones. Existing data, filters, health colors and permissions remain.
- APK analytics cards use 22 px numbers, remove the redundant decorative icon,
  and reduce card height while allowing extra room for enlarged system text.
- APK health chart grows from 220 px to 300 px; its ring is larger. Monthly
  charts grow from 240 px to 320 px.

## Validation

Browser checks cover guardian and staff analytics at 320, 390, 768 and 1440 px:
eight layouts, no horizontal overflow or JavaScript errors. They confirm smaller
metric numbers, compact cards, the desktop summary row and larger chart canvases.
Flutter analyzer: no issues. All 93 Flutter tests passed, with one existing
optional skip. This includes analytics at 320 px with enlarged text and role
navigation through the analytics screen. Release APK build passed.

## APK

- Version: `2.0.0+44`.
- SHA-256: `2433A3369954806BCA0233A513EFFC000CD8D6BDE3E17B727CDB1D58CA050294`.

## Publication

Website: https://mangrooves-php.vercel.app

APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk

Read-only live checks confirmed matching website assets, authentication on
protected API routes, and the configured website origin. The APK download has
the expected attachment type and 59,745,616-byte length. Remote ETag
`3eb9211d11584614fb034c18f673a19f` matches the tested local artifact's MD5.
The local artifact also matches the recorded SHA-256. No production reports
were created or deleted during verification.
