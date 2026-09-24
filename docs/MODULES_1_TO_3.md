# Modules 1–3: implementation and acceptance checklist

Based on Appendix H of the supplied *complete manuscript.pdf* (printed pages 154–155, PDF pages 167–168). Checked on September 18, 2026.

## Registration fixes in this pass

- The local `.env` now uses `mangrooves_db` on port `3307`. The previously configured database named `database` was empty when checked; the current application tables and Inayawan reference row are in `mangrooves_db`.
- Web registration and profile editing collect required first and last names separately and store them in `users.first_name` and `users.last_name`. The compatible full-name display is synchronized. Existing names remain unchanged until their parts are confirmed; see [Separate user names](USER_NAMES.md). The native mobile registration form has not been rebuilt.
- Inayawan, Cebu City is preselected when it is the only available barangay. The form explains the pilot location.
- If barangay data is missing or cannot be loaded, registration shows an error and disables submission instead of leaving an apparently usable empty selector.
- No existing application records were reset or reimported.

## 1. User Access and Role Management

| Manuscript function | Implementation / checks | Remaining acceptance check |
| --- | --- | --- |
| Register new account | Separate web name fields, consent, Inayawan selection, session creation and rejection of public role escalation passed the HTTP journey. Mobile registration remains compatible. | Try the updated form at desktop and phone widths. |
| Login / secure session access | Guardian, expert and administrator sign-in and protected-route checks passed. | Check idle-session expiry in the browser. |
| Edit profile and account information | Separate-name profile update passed the HTTP journey. | Existing users should confirm their first and last names in Settings. |
| Change password | Current-password validation and subsequent sign-in passed. | Check password visibility controls in the browser. |
| Manage user roles and access permissions | Administrator staff provisioning and role-based route restrictions passed. | Review each role's menus and permitted actions. |
| Deactivate / delete accounts | Suspension and deletion of an unused suspended staff account passed. | Review retention behavior for accounts with submitted reports. |

Public self-registration creates guardians. Administrators provision expert and administrator accounts. The manuscript's registration row should distinguish self-registration from staff provisioning; it must not imply public selection of a privileged role.

## 2. Geo-tagged Reporting

| Manuscript function | Implementation / checks | Remaining acceptance check |
| --- | --- | --- |
| Submit mangrove report | Submission, pending status, baseline living count and audit record passed. | Complete a report using a real field observation. |
| Upload field photo | Real PNG upload and private photo access checks passed. | Try camera capture and gallery selection on the intended phone. |
| Capture real-time GPS location | GPS/manual-location validation is implemented; the manual-pin HTTP journey passed. | Test allow/deny location permission and GPS accuracy on site. |
| Input initial mangrove health status | Checklist storage and calculated health preview passed. | Confirm that guardians understand the illustrated choices. |
| View interactive map of submitted reports | Map routes and protected report detail are implemented. | Visually check tiles, pins and popups in the browser. |
| Filter mangrove locations / status | Filter controls and queries are implemented. | Exercise each filter and the empty-result state in the browser. |

The guardian enters observations; the system suggests health status and species, and an expert validates the result. Use this wording when updating the manuscript.

## 3. Scientific Validation

| Manuscript function | Implementation / checks | Remaining acceptance check |
| --- | --- | --- |
| Review pending reports queue | Expert sign-in and opening a pending report passed. | Review queue usability with the scientific expert. |
| Verify / confirm suggested health and species | Expert confirmation passed. | Confirm the displayed terminology matches the field workflow. |
| Correct health / species | Corrections and saved final health, species and attention status passed. | Review the correction form with the expert. |
| Reject report with reason | Rejection with feedback and history passed. | Review wording with a guardian. |
| Send coaching notes / feedback | Guardian visibility of expert feedback and notifications passed. | Review clarity on a phone screen. |
| View validation history | Saved verification history and audit records passed. | Review history navigation as expert and administrator. |

## Validation evidence

- Live application health check: OK, including Inayawan and required reference tables.
- Live `/register.php`: HTTP 200, both name fields present, Inayawan selected, no temporary-unavailability error.
- Updated isolated HTTP journey: 105 passed, 0 failed. It uses and removes a separate disposable database; it does not create test accounts in the live application database.
- Domain/integration suite: 31 passed, 0 failed, using the separate `mangrooves_test` database.
- This is not a claim of completed field acceptance. Browser appearance, real GPS/camera permissions and map interaction require the manual checks above.

Open the local registration form at `http://127.0.0.1:8085/register.php` while the PHP server and XAMPP MySQL are running.
