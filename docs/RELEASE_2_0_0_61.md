# Release 2.0.0+61

The PHP website, mobile website and current Supabase Android client now use a simpler navigation structure, one report list with review actions, one Feedback field and consistent Cebu address fields. The analytics page and PDF now distinguish reports from monitoring sites and avoid unsupported survival percentages.

## Interface and workflow

- Administration has seven main navigation entries: Dashboard; Reports & Monitoring; Analytics & Decision Support; Mangrove Data; User Management; Recognition; System Management. Active groups open automatically. Existing features remain accessible according to role; unsupported Settings or duplicate priority/export pages were not added.
- All reports contains status, health, date and search filters, with review actions for authorized reviewers. Review activity stays available within the reporting interface and on individual reports. Old review/history links still work. Pending dashboard counts open the corresponding pending list.
- Mangrove timeline stays under Reports & Monitoring, preserving the user's requested name. It contains Health history and Mangrove counts (the existing count-based Growth timeline), with verified visits and follow-up links. It does not imply measurements of tree height.
- Report review and follow-up editing use one **Feedback** field plus **Request another observation**. Distinct legacy feedback and follow-up notes are combined when read. Original stored notes are not purged; future edits save one feedback value. Rejection still requires feedback. Confirm still uses the system suggestion without requiring manual health/species entry.
- The Android app uses one grouped menu. Staff have Home, Reports, Map, Analytics and Account tabs. The map loads when first visited. All users keep working Back and Sign out controls.
- The existing real choice photos, saved report drafts, ordered observation categories, account deletion synchronization, badges, private expert ID photos and corrected map labels remain in place.

## Residential addresses

Registration, profile editing and staff creation share the same six address concepts: House no. / unit / building; Street / purok / sitio; City / municipality; Barangay; Province; ZIP code. House, street and ZIP are optional. City and barangay are required. Province is fixed to Cebu. Phone remains required.

Choosing a city limits the searchable barangay list to that city and clears an incompatible previous barangay. All Cebu municipalities and the independent cities are included. Duplicate names are distinguished by city. The backend validates the barangay/city relationship and four-digit optional ZIP code.

Structured fields are stored separately: `house_unit`, `street_sitio`, `city_municipality`, `city_psgc`, `barangay_id`, `barangay_psgc`, `province`, `zip_code`, and `address_version`. Existing `address_line` text remains intact and is shown when structured details are absent. No address is automatically split or guessed. These are additive properties in the existing Supabase JSONB document store, so no new table migration is needed for this release. The previously released Auth deletion synchronization migration remains required.

## Confirmed analytics defects and corrections

The previous survival calculation used site seedling counts without proving that baseline and subsequent visits covered the same population or survey area. A first report could appear as 100% survival, and higher follow-up counts were capped. Report counts and distinct monitored sites also needed separate definitions. Empty periods and insufficient evidence needed explicit handling.

The current schema supports health observations, living-mangrove counts, report review timestamps, site coordinates and explicit parent/follow-up links. It does not establish comparable populations or surveyed areas. **No survival percentage is calculated.** The interface and PDF explain the missing evidence. No environmental records or measurements were generated to populate charts.

## Metrics and calculation methods

| Indicator | Definition |
| --- | --- |
| Verified reports | Reports submitted within the selected period and verified by its end. |
| Monitored clusters | Distinct eligible monitoring sites with at least one such verified report. |
| Latest site condition | Latest eligible visit per site, ordered by submission time and then report ID. |
| Health distribution | One latest condition per site; report-level counts are shown separately in chart data. Unknown is explicit. |
| Monthly health trends | Verified visits grouped by submission month and confirmed health. Months without observations remain gaps. |
| Follow-up reports | Verified reports linked to a verified parent at the same site. |
| Condition change | Latest visit compared with its explicitly linked earlier verified parent: Healthy > Stressed > At Risk. Unknown and unlinked visits are not comparable. |
| Awaiting observation | Latest site visit requests a follow-up and has no non-rejected child submitted by the period end. |
| Sites needing attention | High, Moderate or Insufficient-data sites under the rules below, counted once per site. |
| Survival | Unavailable until comparable baseline/follow-up population and area measurements exist. Missing values are not zero. |

Dates use Asia/Manila. Date, site, species and latest-condition filters are shared by web, Android and PDF. Site/species/condition filters select sites using their latest eligible visit first, then retain earlier visits at those sites for trends. This prevents an old At Risk visit from incorrectly making a currently Healthy site match the At Risk filter. Linked verified parents before the selected start can support a comparison; the displayed visit still has to fall inside the period. Future verification is excluded from historical snapshots. Reports without verification dates are excluded and counted in data limitations.

## Decision support, maps and export

The priority rules are explicit operational guidance: latest At Risk is High; Stressed or an outstanding follow-up is Moderate; Unknown is Insufficient data; otherwise Routine. Each entry includes its evidence, observation date, report and timeline link. Recommendations request further observation or qualified field assessment; they are not ecological risk predictions or automatic restoration approval.

Charts show latest site conditions and monthly health observations, with accessible numeric data. The monitoring map uses saved coordinates for the same filtered sites. Missing coordinates are reported instead of replaced with invented pins. Existing map hover, keyboard, click/tap and detail behavior is preserved.

The administrator PDF includes the applied filters, generation time, monitoring overview, health tables, monthly observations, follow-up comparisons, priority evidence, decision-support guidance and limitations. It uses the existing `pdf-lib` helper, with readable tables, repeated table headers, wrapped text, page numbers and no official signature. PDF export uses the applied server snapshot even if form fields have subsequently been edited without applying them.

## Permissions and data preservation

Guardian report analytics remain limited to their own reports. Existing expert and administrator review permissions are preserved; reviewers still cannot review their own reports. PDF export remains administrator-only. No new role privileges, production test accounts, environmental records or manual account deletions were introduced. Historical reviews, report snapshots, badges and certificates remain intact. Legacy API routes and feedback aliases remain available for older clients.

## Main files

- PHP navigation and layout: `app/Views/partials/{sidebar,mobile-nav,topbar}.php`, `app/Views/dashboard.php`, `app/Cloud/Router.php`, `public/assets/css/app.css`.
- Web workflows: `supabase/web/src/{app,navigation,address-fields,auth-pages,admin-lists,account-admin,analytics-page,ui}.js` and `polish.css`.
- API and calculations: `supabase/functions/api/core/{api,service,domain,profile-fields,review-feedback,analytics,monitoring-analytics,analytics-export}.js` and `supabase/functions/api/pdf.js`.
- Android: API clients; home shell, dashboard, reports, review, profile, registration, management, analytics and audit screens; shared address and follow-up components.
- Regression tests: backend analytics/API tests, web navigation/form/page tests, Flutter address/analytics/navigation tests and existing browser map checks.

## Validation and remaining limits

126 web/backend tests, 84 isolated Supabase API integration checks, and 23 PHP hosting tests passed. The updated PDF also passed its focused eight-test suite after table formatting changes. Chrome checks passed 28 map layouts at 320/390/768/1280 pixels and 27 page layouts at 320/390/1280 pixels, without horizontal page overflow or browser exceptions. All five changed PHP files passed syntax checks. The Edge API type-check passed. Flutter analysis reported no issues.

The complete Flutter suite passed 125 tests, with one optional local-network test skipped. Tests cover all three roles on a small phone, grouped navigation, report refresh, single-feedback forms, structured addresses, analytics filters, drafts, permissions and existing photo/map behavior. The PDF preview rendered correctly on two pages with all extracted text inside page bounds.

After final PDF formatting and mobile priority-layout refinements, 17 focused analytics/page checks and all 84 API integration checks passed again. Analytics-backed report lists reuse the already-loaded report records to avoid a duplicate report query.

## Android artifact

- Package: `org.mangrooves.mobile`; version `2.0.0+61`.
- Size: 60,342,279 bytes; APK Signature Scheme v2 verified.
- SHA-256: `6CC7F565F9C1B8004F14E565D9BC1E8DDD4C893860518328FA27141F5DA4478D`.

Install the updated [Android APK](https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk) to receive native changes. Refresh the [website](https://mangrooves-php.vercel.app) for the web interface.

Survival, height growth, canopy growth and ecological causation cannot be inferred from the present records. The supplied prompts were reviewed; no manuscript file was available in the workspace, so manuscript-specific methodological alignment was not independently verified. Automated and browser checks do not replace physical-phone field testing or an inbox check for actual email delivery.
