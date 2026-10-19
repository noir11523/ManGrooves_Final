# Dashboard and verification counts — October 16, 2026

The read-only production audit matched the supplied screenshots: 3 verified, 2 pending, 0 rejected, 1 verified report needing attention, and 2 visible clusters for staff. Counts were compared with corresponding report filters for all 31 active accounts. No production reports or accounts were changed and no messages were sent.

Dashboard counts include all reports visible to the account: personal reports for guardians, all reports for staff. The review queue excludes the reviewer's own submissions. Health attention is a subset of verified reports with Stressed, At Risk, or Unknown final health; a healthy follow-up request does not increase it. Clusters counts visible pinned sites, rather than reports.

## Fix

Verification card counts previously ignored search, health, date and cluster filters while their lists respected those filters. Cards now use the same filtered report set across all pages. Changing the selected status still displays the counts for every status within that common filter scope.

This is a shared API change for the website, mobile website and existing APK 2.0.0+52. No APK rebuild or database migration is needed.

## Validation

- Reproduced the filtered-count mismatch with an integration regression before the fix.
- 81 local PostgreSQL/API integration checks passed, including every dashboard card, role scoping, self-review exclusion, filtered review counts, pagination, verification/rejection counter changes and duplicate review prevention. Auth, storage and email use test doubles.
- 20 targeted web/domain tests passed, including all four verification card links and retained filters.
- 17 targeted Flutter tests passed, covering all dashboard/review cards, filters, tab refresh, small-screen layout and health-attention labels.
- Supabase Edge runtime type check passed.
- Updated an outdated registration-message assertion to match the previously released Inbox/Spam wording.

## Deployment

The shared `api` Edge Function was deployed to the existing project. Post-deployment checks passed for the API identity and authentication protection on dashboard, verification, reports and clusters. Website and APK sources did not need rebuilding; refresh the page or pull to refresh in the app to load the new totals.
