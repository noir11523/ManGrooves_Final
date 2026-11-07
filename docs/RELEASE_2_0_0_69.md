# ManGROOVES 2.0.0+69 — Notifications

Expert registration previously saved an application without notifying administrators. Web bells and the Android bell also lacked automatic updates, and notification navigation handled report links only.

- Expert signup now saves one private application alert for each active administrator in the registration transaction. Pending applications missed by older versions are recovered without duplicate alerts.
- Web/mobile web bells and the Android badge refresh every 20 seconds while open and when returning to the page/app. Hidden/offline pages skip polling; in-flight requests cannot overlap or update a signed-out screen. Browser Back restores polling for cached pages.
- Application alerts open that applicant, report alerts open that report, and badge alerts open recognition. Target routes are allowlisted; server permissions remain authoritative.
- Experts/admins receive review tasks for other users' pending reports. Completed tasks stop counting as unread. Reporting experts also receive their own feedback, follow-up and badge updates.
- Review feedback, follow-up requests/cancellations and changed instructions notify the report owner. Repeated unchanged saves do not create alerts. A review requesting a follow-up produces one combined alert.
- Read/mark-all operations affect only the signed-in account and synchronize across devices. Foreign notification IDs return 404.

These are in-app notifications. Email decisions remain a separate, retryable applicant-email workflow. No operating-system push subscription or external messaging integration was introduced. Install the new APK to obtain its live bell badge and application/badge navigation; the website receives these changes on refresh.

Validation: notification recipient/deduplication/access tests use the local PostgreSQL fixture and HTTP API; the full API registration/report/validation workflow is exercised separately. Web tests cover count refresh, hidden/offline handling, lifecycle cleanup and safe targets. Flutter tests cover application and badge destinations, read state, timer refresh/resume/disposal and account navigation. Release packaging checks the Android version and public download bytes.

Checks passed: 154 web/API unit checks plus the added cached-page return check; 88 full HTTP workflow checks; 20 Flutter checks; 12 browser layouts spanning all roles; 16 PHP package checks; Flutter analysis and the Edge API check. Both APK signatures validate with the same signing certificate. Published website JavaScript/CSS and the full APK download match local release hashes. All 6 active live profiles were checked without changing accounts or adding test reports; there were no pending expert applications at that check.

Implementation: `supabase/functions/api/core/notifications.js`, `registration.js`, `service.js`, `api.js`; `supabase/web/src/notification-updates.js`, `notification-page.js`; PHP shared topbar/layout and `vercel/src/notifications.js`; Flutter `home_shell.dart`, `notifications_screen.dart`, and the Supabase API client. No SQL migration or analytics reset is required.
