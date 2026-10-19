# Shared report data reset — October 19, 2026

The user selected reports and activity only in the shared Supabase project `rsjwlhqzzvtakcbrzqgi`, preserving accounts, species, sites and checklist setup.

The reset deleted 6 reports, 3 verification records, 21 notifications, 11 earned badge records, 18 photo claims, 51 notification deduplication keys and 22 audit entries. Certificate download links were already empty. All eight activity collections were verified empty afterward. The 12 attached report photos were backed up locally, removed from private Storage, and verified absent.

Report numbering was reset so the next report starts at Report #1. All six sites were retained, with report-derived verified totals set to zero, latest health set to Unknown, and latest report references and observed counts cleared. Site configuration and the global identifier sequence were preserved.

The database changes were applied in a single revision-checked transaction. Preserved collection revisions were verified unchanged: 36 accounts, 7 species, 7 checklist categories, 6 badge definitions, 1 barangay, 5 expert applications and 14 migration file records. Other system settings retained their original document revisions.

The live public API returned zero verified reports and zero sites with verified reports, with 7 species and 26 active guardians still available. Sites continue to exist in the site catalog.

The private local backup is in `backups/supabase-report-reset-20261019-f966ea9b-a58c-4f18-bf1f-602e0030b122/`, which is excluded from Git. It contains the selected activity records, report-counter and site-total recovery data, the attached photos with checksums, and the verified reset result. Account records and unrelated reference/settings payloads were not copied into this backup.

Refresh the website and reopen the app to load the empty report history. Discard any previously saved report draft on the device before starting a new test. Device-local drafts are separate from the shared database.
