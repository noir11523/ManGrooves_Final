# Analytics and PDF review — 8 November 2026

The production comparison was read-only across all 6 active accounts. At the check, staff could see 2 Pending reports, 0 Verified reports and 0 Rejected reports. Each guardian saw only their own records. Zero verified analytics is correct for this dataset; no reports were approved, generated or deleted for the audit.

## Calculation corrections

- Pending/rejected counts under latest-condition or species filters now refer to the selected sites. Previously those records were tested against their unconfirmed final condition/species fields, which could produce incorrect filtered status counts.
- Latest visits are ordered by the actual timestamp, including UTC offsets, with report ID as the tie-breaker. Comparing timestamp strings could select the wrong latest report when offsets differed.
- Missing, malformed and impossible verification dates are excluded from dated totals and reported as data-quality notes. An invalid legacy timestamp no longer breaks the entire response. Repeated date query parameters are rejected with a validation error.
- Follow-up progress requires an earlier verified parent report by the same reporter at the same site. Self-links, future parents and cross-account links cannot inflate follow-up or condition-change figures. A request made after the selected period end does not appear as awaiting a visit in that period.

## Confirmed behavior

Total Verified Reports counts eligible verified visits, including Healthy, Stressed, At Risk and Unknown. Pending and Rejected reports do not enter verified totals or condition charts. The site chart uses one latest verified visit per active site; monthly observations count reports. A latest-condition/species filter selects sites first, retaining earlier eligible visits at those sites in report totals and monthly history. Date boundaries use Asia/Manila and reports must be verified by the period end.

Needs Attention includes sites whose latest verified condition is Stressed, At Risk or Unknown. Healthy sites with an explicit follow-up request remain in Follow-ups. Zero living counts and missing counts remain distinct. Survival stays unavailable because the stored counts do not establish a comparable baseline population and survey area; no percentage is invented.

## Export improvements

The PDF uses the same filtered analytics payload. It now has compact summary cards, a condition distribution bar, monthly totals, and one site table containing the latest report reference, barangay/city, condition, visit date, number of verified visits, living count and next step. Pending/rejected counts are explicitly excluded from verified totals. Months without visits are omitted from the PDF with a short explanatory note; screen chart gaps remain unchanged.

Repeated priority/guidance sections and the long methodology block were removed. Short notes preserve the date/filter interpretation and survival limitation. A4 tables wrap text, repeat headers on new pages and split exceptionally tall rows without losing their final text. Export filenames now match the web and Android wording.

## Validation

- 163 JavaScript checks passed; final targeted analytics/PDF checks passed after layout refinement.
- 91 HTTP workflow checks passed against local PostgreSQL with explicit Auth/Storage doubles, including matching filtered JSON/PDF metrics and PDF permissions.
- 6 Flutter analytics/timeline checks passed; the Edge API type check passed.
- Rendered populated, empty and filtered sample PDFs fit one page. A 45-site long-name fixture spanned 10 pages with repeated headers and no clipped text. An oversized single-row test preserved its final marker across pages and kept text inside page bounds.
- The final read-only live comparison matched source records for all 6 active accounts, including report totals, monthly sums, condition sums, unique sites and attention counts. The live dataset contains no verified observations, so populated scenarios were validated using isolated test fixtures.

Implementation: `supabase/functions/api/core/monitoring-analytics.js`, `analytics-export.js`, `api.js`, `supabase/functions/api/pdf.js`, and their analytics/HTTP tests. The shared API/PDF update serves desktop web, mobile web and the installed Supabase Android app. No APK rebuild, database migration or data reset is required.
