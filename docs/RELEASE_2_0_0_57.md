# ManGROOVES 2.0.0+57

Observation choices use separate pictures instead of repeated leaf drawings and composite guide sheets. The shared catalog supplies 24 checklist choices and 16 Root Type, Leaf Shape, and Bark Texture values with 29 real photographs and two labeled AI educational examples. The AI examples show a creeping underground rhizome and an elliptic leaf underside with fine dark dots. Image provenance, licenses, crop records, and generation prompts are recorded in [OBSERVATION_PHOTOS.md](OBSERVATION_PHOTOS.md).

The web and Android app show bold labels below each image, selection circles, and enlarged previews with Close and Select/Deselect. Repeated circle clicks clear selected answers. Not Sure, All of the above, None of the above, and No Animals remain text-only. A missing image shows an explanation and leaves the answer usable. Authenticated administrator uploads continue to load in the app.

The shared Supabase reference update preserves checklist labels, choice IDs, points, species data, and past reports. The installer backs up reference settings, uploads checksum-verified images, and fills only missing matching references. The public reference bucket now accepts JPEG alongside its existing formats, retaining its existing size limit. The private report bucket is unchanged. No manual SQL is needed.

Validation:

- 102 shared/backend/web tests passed.
- 81 local PostgreSQL/API workflow checks passed.
- 22 PHP/Vercel checks passed.
- Edge function type checks passed.
- Flutter analysis reported no issues. All 117 Flutter tests passed; one optional LAN test was skipped. Coverage includes photo and text-only choices, large text, narrow/landscape previews, repeated selection/deselection, and report draft/review/submission behavior.
- Browser checks passed for all ten categories at 320, 390, and 1280 pixels, three enlarged-preview layouts, and three checklist-editor layouts. Images loaded; selection, deselection, credits and AI labels worked without horizontal page overflow.
- All 31 hosted reference files matched their local SHA-256 checksums. The live database retained its labels, scores and species records; reinstalling would make no reference changes.
- Android release build succeeded. Package `org.mangrooves.mobile`, version name `2.0.0`, version code `57`, display name `ManGROOVES`.

## Android download

- File: `mobile/flutter_app/dist/ManGROOVES-Supabase.apk`
- Size: 59,947,772 bytes.
- SHA-256: `5151170297AA662D2F0863F3E9CA82D3EA5E07F02DA2A84109858108C4FB85AE`.
- Public download: https://mangrooves-php.vercel.app/downloads/ManGROOVES-Supabase.apk

## Publication

Published October 20, 2026 (Asia/Manila) to [the existing website](https://mangrooves-php.vercel.app). The Supabase API includes the photo catalog and credits. Public PHP pages, the website bundle, APK download headers/checksum file, and upload-origin permission passed the publisher's checks.

A separate download check verified all 31 website photo checksums, the updated AI-label UI, and the complete 59,947,772-byte public APK against the release hash above.

Deployment: https://mangrooves-o169s5pbx-clements-projects-5174d0c3.vercel.app

These checks do not constitute expert botanical validation or physical-device field testing. Photos are visual examples; field observations and expert review remain necessary.
