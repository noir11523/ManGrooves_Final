-- Add aggregate answers without changing existing option IDs or report snapshots.
INSERT INTO health_options (criteria_id, code, label, points, display_order)
SELECT id, 'none_of_the_above', 'None of the above', 0, 1000
FROM health_criteria WHERE selection_mode = 'multiple'
ON DUPLICATE KEY UPDATE label = VALUES(label), points = VALUES(points), display_order = VALUES(display_order), active = 1;

-- The classifier calculates the sum of active ordinary options at submission time.
INSERT INTO health_options (criteria_id, code, label, points, display_order)
SELECT id, 'all_of_the_above', 'All of the above', 0, 1001
FROM health_criteria WHERE selection_mode = 'multiple'
ON DUPLICATE KEY UPDATE label = VALUES(label), points = VALUES(points), display_order = VALUES(display_order), active = 1;
