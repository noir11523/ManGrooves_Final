INSERT INTO barangays (id, name, city_municipality, province, country_code, center_lat, center_lng)
VALUES (1, 'Inayawan', 'Cebu City', 'Cebu', 'PH', 10.28330000, 123.88330000)
ON DUPLICATE KEY UPDATE center_lat = VALUES(center_lat), center_lng = VALUES(center_lng);

-- Development fixtures adapted from users (1).xlsx. All demo accounts use Mangrooves123!
INSERT INTO users (id, full_name, email, phone, password_hash, role, barangay_id, status, privacy_consent_at)
VALUES
    (1, 'Test Guardian', 'guardian@test.com', '09171234567', '$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2', 'guardian', 1, 'active', NOW()),
    (2, 'Test Expert', 'expert@test.com', NULL, '$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2', 'expert', NULL, 'active', NOW()),
    (3, 'Test Admin', 'admin@test.com', NULL, '$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2', 'system_admin', NULL, 'active', NOW()),
    (4, 'Guardian Two', 'guardian2@test.com', NULL, '$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2', 'guardian', 1, 'active', NOW()),
    (5, 'Guardian Three', 'guardian3@test.com', NULL, '$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2', 'guardian', 1, 'active', NOW())
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name), role = VALUES(role), barangay_id = VALUES(barangay_id), status = VALUES(status);

INSERT INTO mangrove_species
    (id, scientific_name, common_name, local_name, family, iucn_code, iucn_label, population_trend, root_type, leaf_shape, bark_texture, provenance)
VALUES
    (1, 'Avicennia marina', 'Grey/White Mangrove', 'Miapi, Bungalon, Api-api', 'Avicenniaceae', 'LC', 'Least Concern', 'Decreasing', 'Pneumatophores (pencil-like)', 'Elliptic', 'Smooth with thin flakes, greenish brown', 'CCENRO-derived species workbook supplied for the ManGROOVES pilot'),
    (2, 'Avicennia rumphiana', 'White Mangrove', 'Miapi, Bungalon, Api-api', 'Avicenniaceae', 'VU', 'Vulnerable', 'Decreasing', 'Pneumatophores (pencil-like projections)', 'Elliptic', 'Slightly rough, brown', 'CCENRO-derived species workbook supplied for the ManGROOVES pilot'),
    (3, 'Lumnitzera racemosa', 'White-Flowered Black Mangrove', 'Culasi, Tabao', 'Combretaceae', 'LC', 'Least Concern', 'Decreasing', 'Looping (older trees)', 'Obovate', 'Rough, fibrous, brown with deep fissures', 'CCENRO-derived species workbook supplied for the ManGROOVES pilot'),
    (4, 'Nypa fruticans', 'Mangrove Palm', 'Nipa, Sapsap', 'Palmae', 'LC', 'Least Concern', 'Unknown', 'Creeping rhizomes', 'Lanceolate (leaflets)', 'N/A (palm)', 'CCENRO-derived species workbook supplied for the ManGROOVES pilot'),
    (5, 'Rhizophora apiculata', 'Tall-stilt Mangrove', 'Bakhaw, Bakhaw lalaki', 'Rhizophoraceae', 'LC', 'Least Concern', 'Decreasing', 'Prop roots (stilt roots)', 'Elliptic', 'Rough, grayish to brown', 'CCENRO-derived species workbook supplied for the ManGROOVES pilot'),
    (6, 'Rhizophora mucronata', 'Red Mangrove', 'Bakhaw, Bakhaw babae', 'Rhizophoraceae', 'LC', 'Least Concern', 'Decreasing', 'Prop roots', 'Elliptic (with dark dots)', 'Rough, grayish to brown', 'CCENRO-derived species workbook supplied for the ManGROOVES pilot'),
    (7, 'Rhizophora stylosa', 'Red Mangrove', 'Bakhaw, Bakhaw bato', 'Rhizophoraceae', 'LC', 'Least Concern', 'Decreasing', 'Prop roots', 'Elliptic (waxy, leaves point upward)', 'Rough, grayish to brown', 'CCENRO-derived species workbook supplied for the ManGROOVES pilot')
ON DUPLICATE KEY UPDATE
    common_name = VALUES(common_name), local_name = VALUES(local_name), family = VALUES(family),
    iucn_code = VALUES(iucn_code), iucn_label = VALUES(iucn_label), population_trend = VALUES(population_trend),
    root_type = VALUES(root_type), leaf_shape = VALUES(leaf_shape), bark_texture = VALUES(bark_texture), provenance = VALUES(provenance);

INSERT INTO health_criteria (id, code, name, question_text, selection_mode, score_group, guide_image, display_order)
VALUES
    (1, 'leaf_color', 'Leaf Color', 'What color are the leaves?', 'single', 'health', 'img/guides/leaf-color.png', 1),
    (2, 'leaf_condition', 'Leaf Condition', 'How do the leaves look?', 'single', 'context', 'img/guides/leaf-condition.png', 2),
    (3, 'pests', 'Pests', 'Are there signs of pests?', 'single', 'health', 'img/guides/pests.png', 3),
    (4, 'roots', 'Roots', 'How stable do the roots look?', 'single', 'health', 'img/guides/roots.png', 4),
    (5, 'bark_trunk', 'Bark / Trunk', 'How does the bark or trunk look?', 'single', 'context', 'img/guides/bark.png', 5),
    (6, 'bio_indicators', 'Bio-Indicators', 'What animals did you see?', 'multiple', 'environment', 'img/guides/bio-indicators.png', 6),
    (7, 'negative_signs', 'Negative Signs', 'What negative signs did you see?', 'multiple', 'environment', 'img/guides/negative-signs.png', 7)
ON DUPLICATE KEY UPDATE
    name = VALUES(name), question_text = VALUES(question_text), selection_mode = VALUES(selection_mode),
    score_group = VALUES(score_group), guide_image = VALUES(guide_image), display_order = VALUES(display_order), active = 1;

INSERT INTO health_options (id, criteria_id, code, label, points, display_order)
VALUES
    (1, 1, 'green', 'Green', 2, 1),
    (2, 1, 'light_yellow_green', 'Light / Yellow-Green', 1, 2),
    (3, 1, 'brown_yellow_brown', 'Brown / Yellow-Brown', 0, 3),
    (4, 2, 'smooth_healthy', 'Smooth & Healthy', 2, 1),
    (5, 2, 'waxy_curled', 'Waxy / Curled / Pointing Up', 1, 2),
    (6, 2, 'damaged_spots', 'Damaged / Holes / Dark Spots', 0, 3),
    (7, 2, 'brittle_dry', 'Brittle / Dry', 0, 4),
    (8, 3, 'none_visible', 'None Visible', 2, 1),
    (9, 3, 'few_holes', 'Few Holes / Bites', 1, 2),
    (10, 3, 'many_holes', 'Many Holes / Webbing', 0, 3),
    (11, 4, 'firm_intact', 'Firm & Intact', 2, 1),
    (12, 4, 'loose_damage', 'Loose / Some Damage', 1, 2),
    (13, 4, 'exposed_erosion', 'Exposed / Erosion Visible', 0, 3),
    (14, 4, 'dead_rotten', 'Dead / Rotten', 0, 4),
    (15, 5, 'intact_smooth', 'Intact / Smooth', 2, 1),
    (16, 5, 'peeling_cracks', 'Slightly Peeling / Cracks', 1, 2),
    (17, 5, 'deep_fissures', 'Deep Cracks / Fissures', 0, 3),
    (18, 5, 'missing_damage', 'Missing / Large Damage', 0, 4),
    (19, 6, 'crabs', 'Crabs (Tambasakan)', 1, 1),
    (20, 6, 'birds', 'Birds (Herons / Egrets)', 1, 2),
    (21, 6, 'small_fish', 'Small Fish (Juveniles)', 1, 3),
    (22, 6, 'snails', 'Snails / Shells', 1, 4),
    (23, 6, 'pollinators', 'Butterflies / Bees', 1, 5),
    (24, 7, 'mosquitoes', 'Many Mosquitoes', -1, 1),
    (25, 7, 'trash', 'Trash / Plastic Visible', -1, 2),
    (26, 7, 'no_animals', 'No Animals at All', -1, 3)
ON DUPLICATE KEY UPDATE label = VALUES(label), points = VALUES(points), display_order = VALUES(display_order), active = 1;

INSERT INTO badges (id, code, badge_name, metric, target_value, description, image_path)
VALUES
    (1, 'first_report', 'First Report', 'verified_reports', 1, 'Submitted your first verified report!', 'img/badges/first-report.svg'),
    (2, 'bronze_guardian', 'Bronze Guardian', 'verified_reports', 5, 'Submitted 5 verified reports!', 'img/badges/bronze.svg'),
    (3, 'silver_guardian', 'Silver Guardian', 'verified_reports', 15, 'Submitted 15 verified reports!', 'img/badges/silver.svg'),
    (4, 'gold_guardian', 'Gold Guardian', 'verified_reports', 30, 'Submitted 30 verified reports!', 'img/badges/gold.svg'),
    (5, 'followup_hero', 'Follow-up Hero', 'verified_followups', 20, 'Submitted 20 verified follow-up reports!', 'img/badges/followup.svg'),
    (6, 'species_spotter', 'Species Spotter', 'distinct_species', 10, 'Reported 10 different verified species!', 'img/badges/species.svg')
ON DUPLICATE KEY UPDATE badge_name = VALUES(badge_name), metric = VALUES(metric), target_value = VALUES(target_value),
    description = VALUES(description), image_path = VALUES(image_path), active = 1;

INSERT INTO mangrove_clusters
    (id, cluster_code, barangay_id, name, sitio_name, center_lat, center_lng, radius_meters, species_id, rarity_level, initial_seedlings, latest_health, verified_count, latest_report_at)
VALUES
    (1, 'MGC-INY-001', 1, 'Heritage Boardwalk Cluster', 'Sitio Seaside', 10.28386000, 123.88414000, 75, 5, 'Common', 100, 'Stressed', 2, DATE_SUB(NOW(), INTERVAL 31 DAY)),
    (2, 'MGC-INY-002', 1, 'North Restoration Plot', 'Inayawan North', 10.28502000, 123.88242000, 75, 1, 'Common', 80, 'Healthy', 1, DATE_SUB(NOW(), INTERVAL 10 DAY)),
    (3, 'MGC-INY-003', 1, 'Estuary Edge Cluster', 'Lower Estuary', 10.28172000, 123.88508000, 75, 6, 'Vulnerable', 60, 'At Risk', 1, DATE_SUB(NOW(), INTERVAL 4 DAY))
ON DUPLICATE KEY UPDATE name = VALUES(name), sitio_name = VALUES(sitio_name), center_lat = VALUES(center_lat),
    center_lng = VALUES(center_lng), species_id = VALUES(species_id), rarity_level = VALUES(rarity_level),
    initial_seedlings = VALUES(initial_seedlings), latest_health = VALUES(latest_health), verified_count = VALUES(verified_count),
    latest_report_at = VALUES(latest_report_at);

INSERT INTO reports
    (id, report_code, user_id, barangay_id, cluster_id, parent_report_id, latitude, longitude, location_accuracy,
     sitio_name, photo_path, photo_original_name, photo_mime, guardian_remarks, root_type, leaf_shape, bark_texture,
     suggested_species_id, final_species_id, species_confidence, health_score, health_max_score, environmental_score,
     suggested_health, final_health, observed_alive_count, status, needs_attention, rarity_level, expert_id,
     expert_feedback, submitted_at, verified_at, next_followup_date)
VALUES
    (1, 'MGR-DEMO-0001', 1, 1, 1, NULL, 10.28386000, 123.88414000, 8.50,
     'Sitio Seaside', 'assets/img/hero-mangroves.png', 'demo-site.jpg', 'image/png', 'New planting rows look healthy after high tide.',
     'Prop roots (stilt roots)', 'Elliptic', 'Rough, grayish to brown', 5, 5, 100.00, 6, 6, 2,
     'Healthy', 'Healthy', 85, 'verified', 0, 'Common', 2, 'Healthy establishment. Continue monthly observations.',
     DATE_SUB(NOW(), INTERVAL 61 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(CURDATE(), INTERVAL 30 DAY)),
    (2, 'MGR-DEMO-0002', 1, 1, 1, 1, 10.28385000, 123.88416000, 7.20,
     'Sitio Seaside', 'assets/img/hero-mangroves.png', 'demo-followup.jpg', 'image/png', 'Some yellowing is now visible near the waterline.',
     'Prop roots (stilt roots)', 'Elliptic', 'Rough, grayish to brown', 5, 5, 100.00, 3, 6, 1,
     'Stressed', 'Stressed', 78, 'verified', 1, 'Common', 2, 'Monitor the yellowing and check for drainage obstruction.',
     DATE_SUB(NOW(), INTERVAL 32 DAY), DATE_SUB(NOW(), INTERVAL 31 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
    (3, 'MGR-DEMO-0003', 4, 1, 2, NULL, 10.28502000, 123.88242000, 5.40,
     'Inayawan North', 'assets/img/hero-mangroves.png', 'demo-north.jpg', 'image/png', 'Leaves and roots appear firm.',
     'Pneumatophores (pencil-like)', 'Elliptic', 'Smooth with thin flakes, greenish brown', 1, 1, 100.00, 6, 6, 3,
     'Healthy', 'Healthy', 74, 'verified', 0, 'Common', 2, 'Good condition. Avoid stepping on pneumatophores.',
     DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 20 DAY)),
    (4, 'MGR-DEMO-0004', 5, 1, 3, NULL, 10.28172000, 123.88508000, 11.00,
     'Lower Estuary', 'assets/img/hero-mangroves.png', 'demo-estuary.jpg', 'image/png', 'Exposed roots and plastic were observed after heavy rain.',
     'Prop roots', 'Elliptic (with dark dots)', 'Rough, grayish to brown', 6, 6, 100.00, 1, 6, -1,
     'At Risk', 'At Risk', 38, 'verified', 1, 'Vulnerable', 2, 'Priority cleanup and erosion assessment recommended.',
     DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY)),
    (5, 'MGR-DEMO-0005', 1, 1, NULL, NULL, 10.28268000, 123.88380000, 6.80,
     'Central Shore', 'assets/img/hero-mangroves.png', 'demo-pending.jpg', 'image/png', 'Possible new observation site near the creek mouth.',
     'Pneumatophores (pencil-like projections)', 'Elliptic', 'Slightly rough, brown', 2, NULL, 100.00, 5, 6, 2,
     'Stressed', NULL, 50, 'pending', 0, 'Unassigned', NULL, NULL,
     DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
    (6, 'MGR-DEMO-0006', 4, 1, NULL, NULL, 10.28050000, 123.88600000, 22.00,
     'Outside Pilot Edge', 'assets/img/hero-mangroves.png', 'demo-rejected.jpg', 'image/png', 'Image was taken during a site walk.',
     'Prop roots', 'Elliptic', 'Rough, grayish to brown', 5, NULL, 82.00, 6, 6, 0,
     'Healthy', NULL, NULL, 'rejected', 0, 'Unassigned', 2, 'The photo does not clearly show the reported mangrove or its roots. Please retake it closer to the plant.',
     DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 19 DAY), NULL)
ON DUPLICATE KEY UPDATE
    cluster_id = VALUES(cluster_id), parent_report_id = VALUES(parent_report_id), final_species_id = VALUES(final_species_id),
    final_health = VALUES(final_health), status = VALUES(status), needs_attention = VALUES(needs_attention),
    expert_feedback = VALUES(expert_feedback), next_followup_date = VALUES(next_followup_date);

INSERT IGNORE INTO report_observations (report_id, criteria_id, option_id, points_snapshot)
VALUES
    (1, 1, 1, 2), (1, 2, 4, 2), (1, 3, 8, 2), (1, 4, 11, 2), (1, 5, 15, 2), (1, 6, 19, 1), (1, 6, 20, 1),
    (2, 1, 2, 1), (2, 2, 5, 1), (2, 3, 9, 1), (2, 4, 12, 1), (2, 5, 16, 1), (2, 6, 19, 1),
    (3, 1, 1, 2), (3, 2, 4, 2), (3, 3, 8, 2), (3, 4, 11, 2), (3, 5, 15, 2), (3, 6, 19, 1), (3, 6, 20, 1), (3, 6, 21, 1),
    (4, 1, 3, 0), (4, 2, 6, 0), (4, 3, 9, 1), (4, 4, 13, 0), (4, 5, 17, 0), (4, 7, 25, -1),
    (5, 1, 2, 1), (5, 2, 4, 2), (5, 3, 8, 2), (5, 4, 11, 2), (5, 5, 15, 2), (5, 6, 19, 1), (5, 6, 20, 1),
    (6, 1, 1, 2), (6, 2, 4, 2), (6, 3, 8, 2), (6, 4, 11, 2), (6, 5, 15, 2);

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

INSERT IGNORE INTO verification_logs
    (id, report_id, verifier_id, action, previous_status, new_status, previous_health, new_health, previous_species_id, new_species_id, comment, created_at)
VALUES
    (1, 1, 2, 'confirm', 'pending', 'verified', 'Healthy', 'Healthy', 5, 5, 'Healthy establishment. Continue monthly observations.', DATE_SUB(NOW(), INTERVAL 60 DAY)),
    (2, 2, 2, 'confirm', 'pending', 'verified', 'Stressed', 'Stressed', 5, 5, 'Monitor the yellowing and check for drainage obstruction.', DATE_SUB(NOW(), INTERVAL 31 DAY)),
    (3, 3, 2, 'confirm', 'pending', 'verified', 'Healthy', 'Healthy', 1, 1, 'Good condition. Avoid stepping on pneumatophores.', DATE_SUB(NOW(), INTERVAL 10 DAY)),
    (4, 4, 2, 'correct', 'pending', 'verified', 'At Risk', 'At Risk', 6, 6, 'Priority cleanup and erosion assessment recommended.', DATE_SUB(NOW(), INTERVAL 4 DAY)),
    (5, 6, 2, 'reject', 'pending', 'rejected', 'Healthy', NULL, 5, NULL, 'Photo evidence was insufficient.', DATE_SUB(NOW(), INTERVAL 19 DAY));

INSERT IGNORE INTO user_badges (user_id, badge_id, earned_at)
VALUES
    (1, 1, DATE_SUB(NOW(), INTERVAL 60 DAY)),
    (4, 1, DATE_SUB(NOW(), INTERVAL 10 DAY)),
    (5, 1, DATE_SUB(NOW(), INTERVAL 4 DAY));

UPDATE user_badges ub
JOIN badges b ON b.id = ub.badge_id
SET ub.badge_name_snapshot = COALESCE(ub.badge_name_snapshot, b.badge_name),
    ub.description_snapshot = COALESCE(ub.description_snapshot, b.description),
    ub.metric_snapshot = COALESCE(ub.metric_snapshot, b.metric),
    ub.target_value_snapshot = COALESCE(ub.target_value_snapshot, b.target_value),
    ub.image_path_snapshot = COALESCE(ub.image_path_snapshot, b.image_path);

INSERT IGNORE INTO notifications (id, user_id, type, title, message, link, dedupe_key, read_at, created_at)
VALUES
    (1, 1, 'followup_overdue', 'Follow-up overdue', 'Heritage Boardwalk Cluster needs a new monitoring report.', 'submit-report.php?parent=2', 'followup_overdue:2', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    (2, 1, 'badge_earned', 'Badge earned: First Report', 'Your first verified report unlocked a recognition badge.', 'badges.php', NULL, DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY)),
    (3, 5, 'needs_attention', 'Expert marked a site for attention', 'The Estuary Edge Cluster needs priority cleanup and erosion assessment.', 'reports.php?id=4', NULL, NULL, DATE_SUB(NOW(), INTERVAL 4 DAY));

UPDATE notifications SET dedupe_key = 'followup_overdue:2'
WHERE id = 1 AND type = 'followup_overdue' AND dedupe_key IS NULL;
