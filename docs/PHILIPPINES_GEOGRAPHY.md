# Philippine Barangay Coverage

`supabase/functions/api/data/philippine-barangays.json` is built from the PSGC
API's barangay, city/municipality, province and region directories. It carries
the current 10-digit PSGC code, full administrative labels, and a map point
inside each matched barangay polygon. Existing Cebu application IDs remain unchanged.

The generated JSON stores a gzip/base64 payload with municipality metadata
shared between barangays. `core/barangay-directory.js` restores the full records.
The Cebu boundary reference uses the same lossless encoding through
`core/reference-data.js`. This keeps the Edge API below the upload limit;
directory identities and boundary coordinates are unchanged.

Outside the bundled detailed Cebu coverage, report pins are resolved with
PostGIS against the matching 2023-4q barangay polygons in Supabase. After
the migration and import, the polygon data is stored in
`public.app_barangay_boundaries`; it is not bundled into the Edge Function.
`build-philippine-geography.js` downloads and validates the upstream data.
After applying the migration, `import-philippine-boundaries.js --project
<project-ref>` uploads it in resumable, idempotent batches. Set
`MANGROOVES_SUPABASE_SECRET_KEY` in the local environment before importing.

PSGC directory: https://psgc.gitlab.io/api/barangays/

Boundary source: https://github.com/faeldon/philippines-json-maps/tree/2023-4q/2023/geojson/municities/lowres

The polygon collection preserves its MIT attribution in
`philippine-boundaries.LICENSE.txt`. Reference shapes may not represent new
barangays created after the 2023-4q boundary publication. The builder reports
unmatched current PSGC barangays and leaves their map points empty; the app
never substitutes a neighboring center for a missing boundary.

The 2026-11-05 release contains 42,046 directory entries and 41,356 matching
boundaries. The remaining 690 entries have no map point. The migration and
import were completed in the existing Supabase project; all 41,356 stored
geometries passed validity checks. Lookup and import functions are restricted
to the server role. New installations still need the migration and import.
Missing lookup functions return an unresolved barangay rather than assigning
the resident's home barangay or causing a server error.
