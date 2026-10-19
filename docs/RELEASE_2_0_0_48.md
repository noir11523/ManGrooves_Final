# ManGROOVES 2.0.0+48

## Explore layout

- Centered the public Explore heading, description, and compact search panel above a wider centered map.
- Species search explicitly supports local, common, and scientific names.
- Automatic map fitting is immediate. This prevents a delayed Leaflet zoom callback from accessing a removed map after quickly filtering sites or leaving the page.

## Expert registration and review email

- Expert registration finishes with **Application submitted**, the registered email address, and a reminder to check the decision, administrator note, and Spam folder. It also explains that signing in shows the application status.
- Web and APK use matching wording. The APK confirmation is scrollable on smaller screens. Registration confirmation does not claim an email has already been delivered.
- Confirmed that each application's verified registration address is saved as the decision recipient. Review requests cannot override it. Both approval and decline notices include the saved administrator note; private ID codes and photos are omitted.
- Added Gmail SMTP setup instructions for owners without a domain, alongside the existing Resend instructions. Admin setup help matches across web and APK. [Email setup guide](EXPERT_DECISION_EMAIL.md).
- Live email is still inactive: neither SMTP credentials nor the Resend secret pair was configured when checked on October 16, 2026. A sender account and credentials must be supplied directly in Supabase. No real applicant emails were sent during validation.

## Validation

- 90 Node/web tests passed. Existing form tests also passed after the setup-help changes.
- 78 API integration checks passed using isolated PostgreSQL/PGlite and Auth, Storage, and email test doubles. The checks cover saving the verified registration address, sending the admin note to that address, ignoring a supplied alternative recipient, and preserving decisions when email fails.
- Flutter analysis passed; 103 Flutter tests passed, with one existing optional skip.
- Browser checks passed at 320, 390, 768, and 1440 pixels for Explore, expert-registration completion, and expanded email setup. Heading/search centering, search interactions, page transitions, and horizontal overflow were checked, with no JavaScript exceptions.
- Physical Android devices and real inbox delivery were not tested. No production data was deleted.

## Published verification — October 16, 2026

- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-ongbw1lte-clements-projects-5174d0c3.vercel.app
- APK: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- Live homepage images and JavaScript/CSS hashes match the prepared website. Protected API routes require sign-in, and upload CORS permits the production website.
- APK version: `2.0.0+48`; size: 59,762,004 bytes. The download's content type, attachment header, length, and ETag match the local APK. Its SHA-256 matches the local metadata and published checksum file.
- SHA-256: `1C66E20D6CCB8A9FE637ADE93D0BDD67D88F73686E2C0B9840A3AD7360E489BE`.
- No real inbox check was possible without sender credentials. No production data was deleted and no Git push was performed.
