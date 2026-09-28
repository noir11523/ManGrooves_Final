-- Include mixed observations in the context checks without changing health points.
-- INSERT IGNORE preserves administrator labels and deleted (inactive) choices.
INSERT IGNORE INTO health_options (criteria_id, code, label, points, display_order)
SELECT id, 'all_of_the_above', 'All of the above', 0, 1001 FROM health_criteria
WHERE score_group = 'context';
