# ManGROOVES 2.0.0+51

The expert registration completion screen uses shorter, matching wording on web, mobile web, and Android:

> **Application submitted**
>
> Your expert application is under review.
>
> We'll email the decision and any admin note to **[registered email]**.
>
> Check your **Inbox and Spam folder** for updates.
>
> You can also sign in to check your application status.

The email shown is the applicant's verified registration email. This is the on-screen completion notice; the decision email is attempted after an administrator reviews the application.

Web emphasizes the recipient and Inbox/Spam reminder. The API completion response uses the same wording. Existing registration tests check the registered email and explicit Spam reminder.

No applicant messages are sent by building or publishing this release. No Git push was performed.

## Validation

- All 32 web form tests passed, including the expert completion message, verified recipient, and Inbox/Spam reminder.
- Flutter analysis passed. All 106 Flutter tests passed with one existing optional skip; the expert registration test checks the matching recipient and reminder.
- Release APK 2.0.0+51 built successfully.
- Physical Android hardware and real inbox delivery were not tested for this wording change.

## Published — October 16, 2026

- Website: https://mangrooves-php.vercel.app
- Deployment: https://mangrooves-cef47gvj2-clements-projects-5174d0c3.vercel.app
- APK 2.0.0+51: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- Published JS/CSS match the prepared website; protected endpoints and production CORS checks passed.
- APK size 59,778,384 bytes; headers, ETag, release metadata, and checksum match the local build.
- SHA-256: `DA133D5856A5D74AEE096D9120C3097F0492E47A10A7508BCA86164B580AE5D1`.
