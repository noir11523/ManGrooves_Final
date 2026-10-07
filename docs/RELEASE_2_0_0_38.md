# ManGROOVES 2.0.0+38

This release updates the Supabase-backed website and Android app. It does not
reset the database or change existing report URLs.

## Reporting

- Site overview and close-up photos have separate Camera and Gallery controls.
  Desktop web Camera opens a live webcam preview and releases the camera after
  capture or cancellation. Older APKs can still submit one-photo reports.
- Address lookup shows its loading state, caches repeated searches, and biases
  results toward Cebu without restricting results to Cebu. Existing-site names
  remain canonical; a pin moved outside that site's radius becomes a new site.
- Root, leaf, and bark choices are illustrated in Checklist. Review has larger
  text and both photos. Location coordinates remain internal form values without
  the old Location details disclosure.
- Account-facing report numbers start at 1 per user. Global IDs still identify
  reports in URLs, follow-up relationships, and protected photo access.

## Sites and navigation

- User-created sites are personal until an administrator or expert approves
  them for everyone's site selector. Staff see the creator and approval state.
- Delete removes a site from selection while retaining its historical reports.
  A stale edit or Restore request cannot bring a deleted site back.
- Experts can access Species and Sites. Mobile web puts the additional menu in
  the bottom navigation; Android has a role-specific menu in the top bar.
- Android dashboard cards use status colors, and form text is larger. The public
  homepage puts Sign in beside Register in the hero, removing the duplicate
  Sign in link in the top navigation.

## Data migration

`supabase/scripts/migrate-report-catalog.js` previews by default. Its `--apply`
mode writes a local backup under ignored `tmp/report-catalog/`, then assigns
historical per-user numbers and personal-site ownership in a transaction. It
preserves existing global IDs, coordinates, photos, and report statuses. The
three seeded reference sites and explicitly staff-created sites remain shared.

Applied and verified on October 8, 2026: all 25 existing reports were preserved
across 14 accounts, with three shared reference sites and six personal sites.
Re-running the planning step reports no remaining number or ownership changes.

## Verification

- JavaScript: 68 unit/behavior tests and 67 API integration checks.
- PHP packaging: 21 tests; changed PHP templates pass syntax checks.
- Android: analyzer passes; 86 tests pass with one existing optional skip.
- Browser: responsive report/admin screens at 320, 390, 768, and 1440 pixels;
  desktop camera capture tested using Chrome's simulated camera, including
  cancellation, permission failure, and releasing the stream.
- Public homepage checked at seven widths from 320 to 1920 pixels; all three
  role menus open within the phone viewport without horizontal overflow.
- Supabase Edge type and smoke checks pass.
- Live Vercel pages and bundled assets match the prepared release; protected
  endpoints reject unauthenticated access. The downloaded APK matches SHA-256
  `9B9E10FA71D8F1AE926412ADE415C3B4D095E8E3BECC2D4C9B343DD6213E2CE4`.

No physical phone was connected for this release. Real GPS reception, device
camera permission, and APK installation require a device check. The exact
user-supplied CCENRO news photo still needs an accessible source file; the
existing illustrative middle-card photo is retained until that file is available.
