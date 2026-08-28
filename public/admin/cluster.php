<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

$currentUser = Auth::requireRoles('expert', 'system_admin');
$pdo = Database::connection();
$clusterId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT) ?: null;

if ($clusterId) {
    $statement = $pdo->prepare(
        'SELECT c.*, b.name AS barangay_name, b.city_municipality, b.province,
                s.common_name AS species_name, s.scientific_name, s.iucn_code, s.iucn_label
         FROM mangrove_clusters c
         JOIN barangays b ON b.id = c.barangay_id
         LEFT JOIN mangrove_species s ON s.id = c.species_id
         WHERE c.id = :id LIMIT 1'
    );
    $statement->execute(['id' => $clusterId]);
    $cluster = $statement->fetch();
    if (!$cluster) {
        http_response_code(404);
        exit('Cluster not found.');
    }
    $timelineStatement = $pdo->prepare(
        "SELECT r.id, r.report_code, r.status, r.suggested_health, r.final_health, r.rarity_level,
                r.observed_alive_count, r.needs_attention, r.submitted_at, r.verified_at,
                r.expert_feedback, u.full_name AS guardian_name, e.full_name AS expert_name,
                s.common_name AS species_name
         FROM reports r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN users e ON e.id = r.expert_id
         LEFT JOIN mangrove_species s ON s.id = r.final_species_id
         WHERE r.cluster_id = :cluster_id
         ORDER BY r.submitted_at DESC, r.id DESC"
    );
    $timelineStatement->execute(['cluster_id' => $clusterId]);
    $timeline = $timelineStatement->fetchAll();

    $survivalPoints = [];
    foreach (array_reverse($timeline) as $report) {
        if ($report['status'] === 'verified' && (int) $cluster['initial_seedlings'] > 0 && $report['observed_alive_count'] !== null) {
            $survivalPoints[] = [
                'date' => substr((string) $report['submitted_at'], 0, 10),
                'alive' => (int) $report['observed_alive_count'],
                'rate' => round(min(100, ((int) $report['observed_alive_count'] / (int) $cluster['initial_seedlings']) * 100), 1),
            ];
        }
    }
    render('admin/cluster', [
        'pageTitle' => $cluster['name'],
        'currentUser' => $currentUser,
        'cluster' => $cluster,
        'timeline' => $timeline,
        'survivalPoints' => $survivalPoints,
    ]);
    exit;
}

$barangayFilter = filter_var($_GET['barangay_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
$speciesFilter = filter_var($_GET['species_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
$healthValues = ['Healthy', 'Stressed', 'At Risk', 'Unknown'];
$rawHealthFilter = scalar_string($_GET['health'] ?? null);
$healthFilter = in_array($rawHealthFilter, $healthValues, true) ? $rawHealthFilter : '';
$search = mb_substr(trim(scalar_string($_GET['q'] ?? null)), 0, 100);
$clauses = ['1 = 1'];
$params = [];
if ($barangayFilter) {
    $clauses[] = 'c.barangay_id = :barangay_id';
    $params['barangay_id'] = $barangayFilter;
}
if ($speciesFilter) {
    $clauses[] = 'c.species_id = :species_id';
    $params['species_id'] = $speciesFilter;
}
if ($healthFilter !== '') {
    $clauses[] = 'c.latest_health = :health';
    $params['health'] = $healthFilter;
}
if ($search !== '') {
    $clauses[] = '(c.name LIKE :search_name OR c.cluster_code LIKE :search_code OR c.sitio_name LIKE :search_sitio)';
    $like = '%' . $search . '%';
    $params['search_name'] = $like;
    $params['search_code'] = $like;
    $params['search_sitio'] = $like;
}
$list = $pdo->prepare(
    'SELECT c.*, b.name AS barangay_name, s.common_name AS species_name, s.scientific_name,
            lr.observed_alive_count,
            CASE WHEN c.initial_seedlings > 0 AND lr.observed_alive_count IS NOT NULL
                THEN LEAST(100.0, ROUND((lr.observed_alive_count / c.initial_seedlings) * 100, 1)) ELSE NULL END AS survival_rate
     FROM mangrove_clusters c
     JOIN barangays b ON b.id = c.barangay_id
     LEFT JOIN mangrove_species s ON s.id = c.species_id
     LEFT JOIN reports lr ON lr.id = (
         SELECT r.id FROM reports r WHERE r.cluster_id = c.id AND r.status = \'verified\'
         ORDER BY r.submitted_at DESC, r.id DESC LIMIT 1
     )
     WHERE ' . implode(' AND ', $clauses) . '
     ORDER BY b.name, c.name'
);
$list->execute($params);
$barangays = $pdo->query('SELECT id, name FROM barangays ORDER BY name')->fetchAll();
$species = $pdo->query('SELECT id, common_name, scientific_name FROM mangrove_species WHERE active = 1 ORDER BY common_name, scientific_name')->fetchAll();

render('admin/clusters', [
    'pageTitle' => 'Mangrove clusters',
    'currentUser' => $currentUser,
    'clusters' => $list->fetchAll(),
    'barangays' => $barangays,
    'species' => $species,
    'healthValues' => $healthValues,
    'barangayFilter' => $barangayFilter,
    'speciesFilter' => $speciesFilter,
    'healthFilter' => $healthFilter,
    'search' => $search,
]);
