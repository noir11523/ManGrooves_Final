-- Run this once on an existing ManGROOVES database before using the Flutter app.
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
