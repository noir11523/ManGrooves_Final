# Release 2.0.0+42

Requested report, observation and management refinements, October 11, 2026.

## Behavior

- Animal sightings clear the conflicting “No Animals at All” choice. Mosquitoes
  and trash can remain selected alongside animals. Replacing the negative-signs
  “All of the above” shortcut preserves those specific signs. The web form also
  repairs this conflict in an older restored draft. Server validation still
  rejects contradictory requests that bypass the interface.
- Extra-photo “+ Photo” opens the gallery directly, on web and APK. The two
  required overview/close-up photos retain Camera and Gallery. The existing
  duplicate-photo checks, four-extra-photo cap and combined size limit remain.
- Observation selection indicators and photo thumbnails are circular. Tapping a
  photo opens a larger preview; choosing the card label selects it. No visible
  “Enlarge” control. Multiple-choice groups still support multiple selections.
- Unknown-count guidance: “Choose a site. Count will be unknown.” A saved site
  remains required, and unknown counts remain null rather than zero.
- Staff verification publishes an active personal site into the shared site
  list. Rejection does not publish it; archived/deleted sites are not reactivated.
  Staff can also use “Add to site list” independently. Creator metadata is
  retained and the publishing reviewer/action is recorded. Existing historical
  personal sites can be published with that action; they are not mass-published.
- Pending contains every unverified health category. Verified totals exclude
  pending and rejected reports. Needs attention includes only verified reports
  with Stressed, At Risk or Unknown final health. A Healthy follow-up request
  appears separately and no longer inflates health concerns.
- Local species names are emphasized, followed by common and scientific names
  in reports, review and species management. Staff image management is grouped
  by feature; obsolete question-level guide photo controls are removed while
  stored historical assets and observation IDs remain intact.
- Follow-up checkboxes align with their labels. Returning from report details
  refreshes the APK report list. Explicit parent/child follow-up relationships
  and private photo access are preserved.

## Report numbering

Guardians keep their personal Report #1, #2, #3 sequence. Admin/expert views use
one separate sequence across all accounts. Staff report lists default to oldest
first; dashboard “Latest reports” remains newest first. Filtering does not
renumber reports. Detail pages, review history, follow-up history and analytics
use the appropriate viewer's number.

On first staff access or new submission, an idempotent transaction adds
`staff_report_number` to existing report documents in submission order and
initializes `meta/staff_report_sequence`. New submissions increment that counter
inside their transaction. This adds document fields, not SQL tables/columns;
existing IDs, personal report numbers, ownership, photos and relations are kept.
No data deletion or SQL migration is required. Manual report imports after
initialization must allocate numbers using this counter.

## Validation

- JavaScript regression tests include restored animal conflicts, mosquitoes,
  image previews, direct gallery access, health totals and historical numbering.
- API integration tests cover private/published sites, explicit site approval,
  report verification publishing, concurrent personal/staff numbering,
  follow-up relationships and canonical duplicate-photo rejection.
- Flutter analyzer and full widget/unit tests run in the release build.
- Headless Chrome checks 24 page layouts at 320/390/768/1440 px, observation
  previews, gallery interaction, camera cleanup and follow-up label alignment.

Physical Android/iOS/macOS camera permission dialogs were not tested on devices.
Duplicate detection recognizes identical/canonical copies, not arbitrary crops
or visually similar re-encoded images. Source changes remain local; this release
does not push a new Git commit.

## Release checks and artifact

- 84 JavaScript tests passed.
- 75 isolated API integration checks passed.
- Flutter analyzer: no issues. 93 Flutter tests passed; one existing optional
  test skipped.
- Browser checks: 24 page layouts, no horizontal overflow or JavaScript errors;
  follow-up checkbox centers align at 320, 390 and 1440 px.
- APK version: `2.0.0+42`, 59,745,616 bytes.
- SHA-256: `5DBBBBDD79F5A26939125AB6CA120D895715794C2C4E8EAA5C99D22DC1C14366`.

Published website: https://mangrooves-php.vercel.app

APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk

Read-only live checks confirmed matching website assets, required authentication
on protected API routes, the allowed website origin, and the downloaded APK hash.
They did not submit reports or delete production data. The final browser-only
animal-selection correction preserves a valid “None of the above”/“Not Sure”
negative-sign answer when there is no “No Animals” conflict.
