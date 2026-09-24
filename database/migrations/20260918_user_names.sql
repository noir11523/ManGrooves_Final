-- Additive, repeatable migration. Preserve legacy full names without guessing their parts.
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'first_name') = 0,
    'ALTER TABLE users ADD COLUMN first_name VARCHAR(60) NULL AFTER full_name', 'DO 0'
);
PREPARE name_migration FROM @ddl; EXECUTE name_migration; DEALLOCATE PREPARE name_migration;
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_name') = 0,
    'ALTER TABLE users ADD COLUMN last_name VARCHAR(59) NULL AFTER first_name', 'DO 0'
);
PREPARE name_migration FROM @ddl; EXECUTE name_migration; DEALLOCATE PREPARE name_migration;
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_last_first') = 0,
    'ALTER TABLE users ADD INDEX idx_users_last_first (last_name, first_name)', 'DO 0'
);
PREPARE name_migration FROM @ddl; EXECUTE name_migration; DEALLOCATE PREPARE name_migration;
