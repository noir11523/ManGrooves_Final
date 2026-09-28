-- Unknown is unscored and always requires a review.
ALTER TABLE reports MODIFY health_score SMALLINT NULL DEFAULT NULL,
    MODIFY suggested_health ENUM('Healthy', 'Stressed', 'At Risk', 'Unknown') NOT NULL;
INSERT IGNORE INTO health_options (criteria_id, code, label, points, display_order)
SELECT id, 'unknown', 'Not Sure', 0, 1002 FROM health_criteria;
ALTER TABLE verification_logs MODIFY previous_health ENUM('Healthy', 'Stressed', 'At Risk', 'Unknown') NULL;

-- Mixed health observations use the lowest ordinary score, not a sum.
INSERT IGNORE INTO health_options (criteria_id, code, label, points, display_order)
SELECT id, 'all_of_the_above', 'All of the above', 0, 1001 FROM health_criteria
WHERE code IN ('leaf_color', 'pests', 'roots');
UPDATE health_options SET label = 'Not Sure' WHERE code = 'unknown' AND label IN ('Unknown / not sure', 'Unknown / Not Sure');
