# Release 2.0.0+43

Report interface refinements, October 11, 2026.

- Larger circular observation and species-feature pictures, up to 300 px, in
  responsive cards. Narrow browser screens use less nested padding. Selected
  choices retain a green highlight and selection indicator.
- Tapping a picture opens a near-full-screen preview without an “Enlarge” label.
  The APK preview supports pinch zoom. Closing the preview preserves selections.
- “Unable to count” uses a more compact control. Its guidance remains exactly
  “Choose a site. Count will be unknown.” A saved site is still required;
  unknown counts are never stored as zero.
- Dashboard and analytics use one “Total Reports Verified” metric, counting only
  verified reports. Pending includes every pending health category. Needs
  attention includes only verified reports with concerning/unknown final health.
  Healthy follow-up requests remain separate. No duplicate total was added.

Release 42 behavior is retained: animals and mosquitoes can coexist; selecting
animals clears “No Animals at All”; personal sites become shared through staff
verification or “Add to site list”; local/common/scientific names stay in that
order; the health editor remains grouped; + Photo opens the gallery; guardian
numbers remain personal while staff numbers are global and stable.

No database deletion, SQL schema migration, or Git push is part of this release.
Historical personal sites are not mass-published. Use “Add to site list” for a
site whose report was verified before automatic site publication was introduced.

## Validation

- 84 JavaScript tests passed, including animal/mosquito conflict resolution,
  restored drafts, duplicate photos, preview selection and unknown counts.
- 75 isolated API integration checks passed, including private/shared sites,
  staff verification, follow-ups and independent guardian/staff numbering.
- Flutter analyzer: no issues. 93 Flutter tests passed; one existing optional
  test skipped. Small-phone analytics and report navigation are covered.
- Headless Chrome: 24 page layouts at 320/390/768/1440 px, no horizontal overflow
  or JavaScript errors. Checks also cover larger previews, circular choices,
  aligned follow-up controls, direct gallery access and camera cleanup.
- PHP dashboard syntax check passed.

The checks use local fixtures and an isolated test database. Physical-device
camera permission dialogs and native gallery interfaces were not tested here.

## APK artifact

- Version: `2.0.0+43`.
- Size: 59,745,616 bytes.
- SHA-256: `87DB4EBF2DA7EAE8526511F19B1AC6103733FE3A2F9A6F38B40CA8435204F318`.

## Publication

Published: https://mangrooves-php.vercel.app

APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk

Live read-only checks confirmed matching website JS/CSS/images, authentication
on protected API routes, and the configured website origin. The APK returns HTTP
200 with the correct attachment type and 59,745,616-byte length. Its remote ETag
`76eee5d8885f7b9f522b4467a74ab460` matches the local APK MD5. The slow full-body
download was stopped after this metadata comparison; a downloaded SHA-256 was
not obtained. The local build SHA-256 is recorded above.
