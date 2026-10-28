# Release 2.0.0+63

Explore has a Back control with a dashboard fallback. Its location filters use the barangay containing each site pin, including the city or municipality for duplicate names.

Report barangays are resolved from coordinates using the bundled Cebu reference boundaries. New reports and their new sites save that barangay; the account's home barangay is unchanged. Existing report and site labels are corrected when read, without rewriting historical coordinates or notes. A guardian retains access to their own sites and visited shared sites outside their home barangay; other guardians' private reports and personal sites remain protected.

GPS, manual pins and address search keep the report name synchronized. The last accepted GPS fix always gets an address lookup. Older replies cannot overwrite a newer pin. The map picker in Android updates its name while moving, and GPS retries replace the previous address. A selected follow-up remains inside its requested site. Barangay lookup still works when the external address provider is unavailable; uncertain or out-of-coverage pins are not assigned to the resident's barangay.

Boundary source and license: [Cebu directory notes](CEBU_BARANGAYS.md). Street and landmark suggestions use OpenStreetMap / Photon; the coordinates remain the report location. No database migration is required.

Validation: 130 web/backend tests, 86 local PostgreSQL/API checks, all 23 packaged PHP website checks, and 127 Flutter tests passed (one optional local-network test skipped). Flutter analysis reported no issues. Chrome verified Explore and report location at 320, 390 and 1280 pixels, including Back, GPS-to-manual pin updates, filters and no horizontal page overflow. Tests cover delayed address replies, profile/location separation, older mislabeled sites, draft preservation and private-site access.

Signed Android package: `org.mangrooves.mobile`, version code `63`, version name `2.0.0`. APK size: 60,342,331 bytes. SHA-256: `AD350070FB44DF16B9801C93568DE04F00C1D126BDA317D784EF56D6D925B283`.

Published to the existing Vercel website and Supabase API. Live asset hashes match the build; the Android checksum and three download byte ranges match the signed package. All six public Explore sites return barangays consistent with their coordinates. Public pages, API configuration and photo-upload origin checks passed without creating production test records.
