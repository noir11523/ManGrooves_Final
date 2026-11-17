# ManGROOVES 2.0.0+77

This release publishes the checklist/photo update and the separately audited safe cleanup.

## User-facing changes

- Answer-choice drag handles save the complete card order and synchronize it with reporting. Configured category/answer order is used in Step 3, Step 4 and report observations.
- Report Observations shows the original total out of 6 and suggested condition, separately from the expert's final condition. Leaf Color, Pests and Roots remain the only 0-2-point indicators. Supporting answers save zero new points and remain available for review.
- Confirm system suggestions requires both known condition and known active species. Staff creation accepts Expert only, with an empty mobile-number field.
- Reports support 10 photos total (two main and eight additional). Existing per-photo 5 MB, combined 12 MB and processed-image 6 MP limits remain.
- Mobile photo selection preserves suitable originals and safely bounds larger images without upscaling. Required backend preflight and final validation use the same image-quality rules. A directional-focus check detects the synthetic severe motion/light-trail regression without increasing the existing Laplacian thresholds.

## Safe cleanup

Removed the unused Cupertino icon dependency and 28 confirmed generated/diagnostic files (924,859 bytes). Kept recovery tools, backups, environment settings, signing assets and Flutter platform support. See [cleanup audit](CODEBASE_CLEANUP_AUDIT.md) and [project map](PROJECT_MAP.md).

## Validation and limits

202 shared/backend/web tests, 101 API integration checks, 173 Flutter tests and 49 legacy JavaScript tests passed. One opt-in LAN-discovery test remains skipped. Dart analysis, Edge type check, Deno HTTP smoke test, web build, Android release build and 28 browser map layouts passed. **28 packaged PHP/web tests passed** against the fresh release package.

Legacy PHP/MySQL integration could not connect to the stopped local database server. Production database data was not modified by this cleanup. The supporting-choice SQL migration remains manual and requires a verified backup and explicit migration approval; runtime scoring already saves new supporting points as zero. Historical reports and logs are preserved.

Physical phone camera/gallery acceptance and executable testing of the exact user-attached blur photograph remain outstanding. The motion-trail regression fixture is synthetic. This release does not claim universal blur detection or faster server responses from cleanup.

APK SHA-256: `933838cf816e914af5b027170b921a71b4911423b0d0ea783d3bdec5221ace8b`.

## Publication

Published **17 November 2026 (Asia/Manila)**.

- Feature/cleanup commit: `b796e87` on `main`, pushed to `https://github.com/noir11523/ManGrooves_Final`.
- Production website: https://mangrooves-php.vercel.app
- Vercel release: https://mangrooves-j4rqy6kn3-clements-projects-5174d0c3.vercel.app
- Supabase project: `rsjwlhqzzvtakcbrzqgi`; Edge function `api` **version 151 ACTIVE**. Existing schema, credentials and Auth settings were retained. The normal publish workflow updated allowed website origins and deployed the API; no database migration was run.
- Android download: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk
- **12 read-only live checks passed**: public PHP pages, new bundled feature markers, Supabase configuration, public summary, unauthenticated access guards, production upload CORS and a full downloaded-APK SHA-256 match.

The live checks created no users, reports, emails or checklist records. Real phone camera/gallery tests remain outstanding. The production supporting-choice migration remains manual and unapplied.

