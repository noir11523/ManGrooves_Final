# ManGROOVES project map

Use this guide to trace the current system during the capstone defense.

| Area | Start here | Purpose |
| --- | --- | --- |
| Current website | `vercel/build.mjs`, `app/Cloud/Router.php` | Packages the PHP website and its Supabase interface |
| Shared web features | `supabase/web/src/app.js` | Reports, checklist, species, administration and analytics screens |
| Report form | `supabase/web/src/report-form.js` | Details, Location, Traits and Conditions, Review |
| Website session/API bridge | `app/Cloud/Client.php`, `vercel/src/client.js` | Connects the PHP session to the Supabase API |
| Supabase API | `supabase/functions/api/index.ts`, `core/api.js` | Routes requests and checks access |
| Application rules | `supabase/functions/api/core/service.js`, `domain.js` | Reporting, review and shared rules |
| Database adapter | `supabase/functions/api/database.js` | PostgreSQL RPC access through the Supabase SDK |
| Database structure | `supabase/migrations/` | Versioned SQL schema and database functions |
| Photo validation | `supabase/functions/api/core/photo-quality.js` | Shared backend image-quality validation |
| Flutter app | `mobile/flutter_app/lib/main.dart`, `app.dart` | Native Android/iOS client; Supabase is the default backend |
| Flutter screens | `mobile/flutter_app/lib/screens/` | Mobile report, review, map, analytics and administration interfaces |
| Android build | `mobile/flutter_app/android/` | Required Flutter Android project, Gradle and platform integration |
| Tests | `supabase/test/`, `supabase/web/test/`, `vercel/test/`, `mobile/flutter_app/test/` | Backend, web, PHP package and app checks |
| Setup and publishing | `docs/SUPABASE_MIGRATION.md`, `docs/VERCEL_PHP.md` | Existing configuration and release procedures |

Current flow: website or Flutter app -> Supabase Edge API -> Supabase Auth, PostgreSQL and Storage. The website retains its PHP session and layout layer. Vercel reuses the shared web modules rather than implementing a second reporting system.

## Retained compatibility and recovery code

`app/Services/`, most legacy `public/*.php` routes, `database/` and the MySQL setup tools support the explicit legacy backend and its tests. `firebase/` and the mobile Firebase adapter support the documented rollback path. `mobile/android-apk/` is the previous WebView wrapper. These are separate from the default Supabase/Flutter path and were retained because they still have documented or executable consumers.

Do not remove all of `app/` or `public/`: the current Vercel build copies selected files from both. MySQL import/export scripts under Supabase are migration tools. Keep SQL migrations, backup folders, environment settings and signing keys.

The [cleanup audit](CODEBASE_CLEANUP_AUDIT.md) lists exact removals and retained items. The [checklist/photo update](CHECKLIST_PHOTO_UPDATE.md) explains the pending feature release, thresholds and manual migration requirements.
