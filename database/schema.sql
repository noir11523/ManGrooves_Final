CREATE TABLE IF NOT EXISTS barangays (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    city_municipality VARCHAR(120) NOT NULL DEFAULT 'Cebu City',
    province VARCHAR(120) NOT NULL DEFAULT 'Cebu',
    country_code CHAR(2) NOT NULL DEFAULT 'PH',
    psgc_code VARCHAR(20) NULL,
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_barangay_jurisdiction (name, city_municipality, province),
    CONSTRAINT chk_barangay_lat CHECK (center_lat BETWEEN -90 AND 90),
    CONSTRAINT chk_barangay_lng CHECK (center_lng BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('guardian', 'expert', 'system_admin') NOT NULL DEFAULT 'guardian',
    barangay_id SMALLINT UNSIGNED NULL,
    status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
    session_version INT UNSIGNED NOT NULL DEFAULT 0,
    privacy_consent_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role_status (role, status),
    KEY idx_users_barangay (barangay_id),
    CONSTRAINT fk_users_barangay FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    was_successful TINYINT(1) NOT NULL DEFAULT 0,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_login_attempts_email_time (email, attempted_at),
    KEY idx_login_attempts_ip_time (ip_address, attempted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mobile_api_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    session_version INT UNSIGNED NOT NULL,
    device_name VARCHAR(120) NOT NULL DEFAULT 'Flutter mobile app',
    last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_mobile_api_token_hash (token_hash),
    KEY idx_mobile_api_user_expiry (user_id, expires_at),
    CONSTRAINT fk_mobile_api_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registration_attempts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    was_successful TINYINT(1) NOT NULL DEFAULT 0,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_registration_attempts_ip_time (ip_address, attempted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mangrove_species (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scientific_name VARCHAR(190) NOT NULL,
    common_name VARCHAR(190) NOT NULL,
    local_name VARCHAR(255) NULL,
    family VARCHAR(120) NULL,
    iucn_code VARCHAR(10) NULL,
    iucn_label VARCHAR(60) NULL,
    population_trend ENUM('Increasing', 'Stable', 'Decreasing', 'Unknown') NOT NULL DEFAULT 'Unknown',
    root_type VARCHAR(190) NOT NULL,
    root_type_image VARCHAR(255) NULL,
    leaf_shape VARCHAR(190) NOT NULL,
    leaf_shape_image VARCHAR(255) NULL,
    bark_texture VARCHAR(255) NOT NULL,
    bark_texture_image VARCHAR(255) NULL,
    provenance VARCHAR(255) NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_species_scientific_name (scientific_name),
    KEY idx_species_active_common (active, common_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS health_criteria (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(120) NOT NULL,
    question_text VARCHAR(255) NOT NULL,
    selection_mode ENUM('single', 'multiple') NOT NULL DEFAULT 'single',
    score_group ENUM('health', 'context', 'environment') NOT NULL DEFAULT 'context',
    guide_image VARCHAR(255) NULL,
    display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_health_criteria_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS health_options (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    criteria_id SMALLINT UNSIGNED NOT NULL,
    code VARCHAR(80) NOT NULL,
    label VARCHAR(190) NOT NULL,
    points SMALLINT NOT NULL DEFAULT 0,
    image_path VARCHAR(255) NULL,
    display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_health_option_code (criteria_id, code),
    KEY idx_health_options_criteria (criteria_id, active, display_order),
    CONSTRAINT fk_health_options_criteria FOREIGN KEY (criteria_id) REFERENCES health_criteria(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mangrove_clusters (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cluster_code VARCHAR(40) NOT NULL,
    barangay_id SMALLINT UNSIGNED NOT NULL,
    name VARCHAR(160) NOT NULL,
    sitio_name VARCHAR(120) NULL,
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius_meters SMALLINT UNSIGNED NOT NULL DEFAULT 75,
    species_id SMALLINT UNSIGNED NULL,
    rarity_level ENUM('Common', 'Vulnerable', 'Rare', 'Unassigned') NOT NULL DEFAULT 'Unassigned',
    initial_seedlings INT UNSIGNED NOT NULL DEFAULT 0,
    latest_health ENUM('Healthy', 'Stressed', 'At Risk', 'Unknown') NOT NULL DEFAULT 'Unknown',
    verified_count INT UNSIGNED NOT NULL DEFAULT 0,
    latest_report_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cluster_code (cluster_code),
    KEY idx_clusters_barangay (barangay_id),
    KEY idx_clusters_species (species_id),
    KEY idx_clusters_health (latest_health),
    CONSTRAINT fk_clusters_barangay FOREIGN KEY (barangay_id) REFERENCES barangays(id),
    CONSTRAINT fk_clusters_species FOREIGN KEY (species_id) REFERENCES mangrove_species(id) ON DELETE SET NULL,
    CONSTRAINT chk_cluster_lat CHECK (center_lat BETWEEN -90 AND 90),
    CONSTRAINT chk_cluster_lng CHECK (center_lng BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_code VARCHAR(40) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    barangay_id SMALLINT UNSIGNED NOT NULL,
    cluster_id BIGINT UNSIGNED NULL,
    parent_report_id BIGINT UNSIGNED NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_accuracy DECIMAL(8, 2) NULL,
    sitio_name VARCHAR(120) NULL,
    photo_path VARCHAR(255) NOT NULL,
    photo_original_name VARCHAR(255) NULL,
    photo_mime VARCHAR(80) NOT NULL,
    photo_sha256 CHAR(64) NULL,
    guardian_remarks TEXT NULL,
    root_type VARCHAR(190) NOT NULL,
    leaf_shape VARCHAR(190) NOT NULL,
    bark_texture VARCHAR(255) NOT NULL,
    suggested_species_id SMALLINT UNSIGNED NULL,
    final_species_id SMALLINT UNSIGNED NULL,
    species_confidence DECIMAL(5, 2) NULL,
    health_score SMALLINT NOT NULL DEFAULT 0,
    health_max_score SMALLINT UNSIGNED NOT NULL DEFAULT 6,
    environmental_score SMALLINT NOT NULL DEFAULT 0,
    suggested_health ENUM('Healthy', 'Stressed', 'At Risk') NOT NULL,
    final_health ENUM('Healthy', 'Stressed', 'At Risk') NULL,
    observed_alive_count INT UNSIGNED NULL,
    status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    needs_attention TINYINT(1) NOT NULL DEFAULT 0,
    rarity_level ENUM('Common', 'Vulnerable', 'Rare', 'Unassigned') NOT NULL DEFAULT 'Unassigned',
    expert_id BIGINT UNSIGNED NULL,
    expert_feedback TEXT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME NULL,
    next_followup_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_report_code (report_code),
    KEY idx_reports_user_status (user_id, status),
    KEY idx_reports_cluster_status_date (cluster_id, status, submitted_at),
    KEY idx_reports_status_submitted (status, submitted_at),
    KEY idx_reports_followup (user_id, next_followup_date),
    KEY idx_reports_species (final_species_id, status),
    KEY idx_reports_barangay (barangay_id, status),
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_reports_barangay FOREIGN KEY (barangay_id) REFERENCES barangays(id),
    CONSTRAINT fk_reports_cluster FOREIGN KEY (cluster_id) REFERENCES mangrove_clusters(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_parent FOREIGN KEY (parent_report_id) REFERENCES reports(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_suggested_species FOREIGN KEY (suggested_species_id) REFERENCES mangrove_species(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_final_species FOREIGN KEY (final_species_id) REFERENCES mangrove_species(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_expert FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_report_lat CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_report_lng CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_observations (
    report_id BIGINT UNSIGNED NOT NULL,
    criteria_id SMALLINT UNSIGNED NOT NULL,
    option_id SMALLINT UNSIGNED NOT NULL,
    points_snapshot SMALLINT NOT NULL DEFAULT 0,
    criteria_code_snapshot VARCHAR(60) NULL,
    criterion_name_snapshot VARCHAR(120) NULL,
    score_group_snapshot VARCHAR(30) NULL,
    selection_mode_snapshot VARCHAR(20) NULL,
    option_code_snapshot VARCHAR(80) NULL,
    option_label_snapshot VARCHAR(190) NULL,
    criteria_order_snapshot SMALLINT UNSIGNED NULL,
    option_order_snapshot SMALLINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id, option_id),
    KEY idx_observations_criteria (criteria_id),
    CONSTRAINT fk_observations_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_observations_criteria FOREIGN KEY (criteria_id) REFERENCES health_criteria(id),
    CONSTRAINT fk_observations_option FOREIGN KEY (option_id) REFERENCES health_options(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS verification_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    verifier_id BIGINT UNSIGNED NOT NULL,
    action ENUM('confirm', 'correct', 'reject') NOT NULL,
    previous_status ENUM('pending', 'verified', 'rejected') NOT NULL,
    new_status ENUM('pending', 'verified', 'rejected') NOT NULL,
    previous_health ENUM('Healthy', 'Stressed', 'At Risk') NULL,
    new_health ENUM('Healthy', 'Stressed', 'At Risk') NULL,
    previous_species_id SMALLINT UNSIGNED NULL,
    new_species_id SMALLINT UNSIGNED NULL,
    comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_verification_report_date (report_id, created_at),
    KEY idx_verification_verifier (verifier_id, created_at),
    CONSTRAINT fk_verification_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_verification_user FOREIGN KEY (verifier_id) REFERENCES users(id),
    CONSTRAINT fk_verification_previous_species FOREIGN KEY (previous_species_id) REFERENCES mangrove_species(id) ON DELETE SET NULL,
    CONSTRAINT fk_verification_new_species FOREIGN KEY (new_species_id) REFERENCES mangrove_species(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS badges (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) NOT NULL,
    badge_name VARCHAR(120) NOT NULL,
    metric ENUM('verified_reports', 'verified_followups', 'distinct_species', 'uncorrected_reports', 'steward_days') NOT NULL,
    target_value INT UNSIGNED NOT NULL,
    description VARCHAR(255) NOT NULL,
    image_path VARCHAR(255) NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_badge_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_badges (
    user_id BIGINT UNSIGNED NOT NULL,
    badge_id SMALLINT UNSIGNED NOT NULL,
    badge_name_snapshot VARCHAR(120) NULL,
    description_snapshot VARCHAR(255) NULL,
    metric_snapshot VARCHAR(60) NULL,
    target_value_snapshot INT UNSIGNED NULL,
    image_path_snapshot VARCHAR(255) NULL,
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id),
    CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(60) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(255) NULL,
    dedupe_key VARCHAR(190) NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notifications_user_read (user_id, read_at, created_at),
    UNIQUE KEY uq_notifications_dedupe (dedupe_key),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NULL,
    entity_id VARCHAR(64) NULL,
    details_json LONGTEXT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_audit_user_date (user_id, created_at),
    KEY idx_audit_action_date (action, created_at),
    KEY idx_audit_entity (entity_type, entity_id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Idempotent, MySQL 5.7-compatible upgrades for installations created before
-- security/session and badge-snapshot fields were introduced.
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'session_version') = 0,
    'ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER status',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'criteria_code_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN criteria_code_snapshot VARCHAR(60) NULL AFTER points_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'criterion_name_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN criterion_name_snapshot VARCHAR(120) NULL AFTER criteria_code_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'score_group_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN score_group_snapshot VARCHAR(30) NULL AFTER criterion_name_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'selection_mode_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN selection_mode_snapshot VARCHAR(20) NULL AFTER score_group_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'option_code_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN option_code_snapshot VARCHAR(80) NULL AFTER selection_mode_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'option_label_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN option_label_snapshot VARCHAR(190) NULL AFTER option_code_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'criteria_order_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN criteria_order_snapshot SMALLINT UNSIGNED NULL AFTER option_label_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_observations' AND COLUMN_NAME = 'option_order_snapshot') = 0,
    'ALTER TABLE report_observations ADD COLUMN option_order_snapshot SMALLINT UNSIGNED NULL AFTER criteria_order_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

UPDATE report_observations ro
JOIN health_criteria c ON c.id = ro.criteria_id
JOIN health_options o ON o.id = ro.option_id
SET ro.criteria_code_snapshot = COALESCE(ro.criteria_code_snapshot, c.code),
    ro.criterion_name_snapshot = COALESCE(ro.criterion_name_snapshot, c.name),
    ro.score_group_snapshot = COALESCE(ro.score_group_snapshot, c.score_group),
    ro.selection_mode_snapshot = COALESCE(ro.selection_mode_snapshot, c.selection_mode),
    ro.option_code_snapshot = COALESCE(ro.option_code_snapshot, o.code),
    ro.option_label_snapshot = COALESCE(ro.option_label_snapshot, o.label),
    ro.criteria_order_snapshot = COALESCE(ro.criteria_order_snapshot, c.display_order),
    ro.option_order_snapshot = COALESCE(ro.option_order_snapshot, o.display_order);

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'dedupe_key') = 0,
    'ALTER TABLE notifications ADD COLUMN dedupe_key VARCHAR(190) NULL AFTER link',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'uq_notifications_dedupe') = 0,
    'ALTER TABLE notifications ADD UNIQUE INDEX uq_notifications_dedupe (dedupe_key)',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_badges' AND COLUMN_NAME = 'badge_name_snapshot') = 0,
    'ALTER TABLE user_badges ADD COLUMN badge_name_snapshot VARCHAR(120) NULL AFTER badge_id',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_badges' AND COLUMN_NAME = 'description_snapshot') = 0,
    'ALTER TABLE user_badges ADD COLUMN description_snapshot VARCHAR(255) NULL AFTER badge_name_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_badges' AND COLUMN_NAME = 'metric_snapshot') = 0,
    'ALTER TABLE user_badges ADD COLUMN metric_snapshot VARCHAR(60) NULL AFTER description_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_badges' AND COLUMN_NAME = 'target_value_snapshot') = 0,
    'ALTER TABLE user_badges ADD COLUMN target_value_snapshot INT UNSIGNED NULL AFTER metric_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_badges' AND COLUMN_NAME = 'image_path_snapshot') = 0,
    'ALTER TABLE user_badges ADD COLUMN image_path_snapshot VARCHAR(255) NULL AFTER target_value_snapshot',
    'DO 0'
);
PREPARE migration_statement FROM @ddl; EXECUTE migration_statement; DEALLOCATE PREPARE migration_statement;

UPDATE user_badges ub
JOIN badges b ON b.id = ub.badge_id
SET ub.badge_name_snapshot = COALESCE(ub.badge_name_snapshot, b.badge_name),
    ub.description_snapshot = COALESCE(ub.description_snapshot, b.description),
    ub.metric_snapshot = COALESCE(ub.metric_snapshot, b.metric),
    ub.target_value_snapshot = COALESCE(ub.target_value_snapshot, b.target_value),
    ub.image_path_snapshot = COALESCE(ub.image_path_snapshot, b.image_path);
