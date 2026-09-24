# Separate user names

Applied to the local `mangrooves_db` database on September 18, 2026.

## Database and application behavior

- `users.first_name`: up to 60 characters.
- `users.last_name`: up to 59 characters.
- `users.full_name`: retained for older clients and existing report/certificate displays. Updated web forms save all three together in the same SQL statement.
- `idx_users_last_first`: index on last name and first name.

Registration (both the homepage popup and separate page), Settings, administrator staff creation and the administrator creation script save the separate fields. Admin **Users** displays each field and provides **First name starts with** and **Last name starts with** filters. Those filters can be combined with role, status, barangay and general search.

## Existing accounts

Existing names were not split automatically: names such as “Maria Elena Dela Cruz” do not identify where the surname begins. The five accounts present at migration retain their exact full names, IDs and related records. Their new fields initially contain NULL, displayed as **Not confirmed** in the admin list.

Each user can open **Settings**, see their saved name, enter the correct first and last names, and save. General name search still finds unconfirmed accounts through the preserved full name. The separate-name filters match confirmed parts only.

The mobile API accepts and returns separate names while remaining compatible with the existing APK, which still sends `full_name`. An unchanged legacy name preserves confirmed parts. If an old client changes only the full name, the separate parts return to NULL to avoid stale or incorrectly guessed names. The native Flutter forms/APK were not rebuilt in this change.

## Viewing the columns

In phpMyAdmin open **mangrooves_db → users → Structure** to see `first_name` and `last_name`; **Browse** shows their values. The migration has already been applied locally; no manual phpMyAdmin changes are needed.

## Other installations

Back up the target database, then run from the project root:

```powershell
& 'C:\xampp\php\php.exe' .\scripts\migrate-user-names.php
```

The script uses `.env`, adds missing columns/index only, preserves full names, and can be rerun. Schema DDL is not transactionally reversible in MariaDB; retain the backup. The fresh schema includes the same definitions and compatibility upgrade. Do not rerun the demo installer to perform this migration.

Local pre-migration backup: `storage/backups/before-user-names-20260918-175349.sql`. It contains account data and must remain private.

## Checks

- Live database columns verified; five existing accounts preserved.
- Application health check: OK.
- Domain/integration suite: 31 passed, 0 failed, including repeatable migration, malformed name validation and legacy-name preservation.
- Isolated HTTP journey: 105 passed, 0 failed, including separate-name persistence, compound names, profile edits, staff creation, admin name filters, mobile API compatibility and report/certificate compatibility.
