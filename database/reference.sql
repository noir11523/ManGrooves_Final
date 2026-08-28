-- Production-safe reference data derived from the supplied workbooks.
-- This file contains no users, reports, clusters, notifications, or demo activity.

INSERT INTO barangays (id, name, city_municipality, province, country_code, center_lat, center_lng)
VALUES (1, 'Inayawan', 'Cebu City', 'Cebu', 'PH', 10.28330000, 123.88330000)
ON DUPLICATE KEY UPDATE center_lat = VALUES(center_lat), center_lng = VALUES(center_lng);

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
