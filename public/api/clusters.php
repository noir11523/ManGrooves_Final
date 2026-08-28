<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::user();
if (!$user) {
    json_response(['ok' => false, 'message' => 'Authentication required.'], 401);
}
header('Cache-Control: private, no-store');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
}
$speciesId = null;
if (array_key_exists('species_id', $_GET) && $_GET['species_id'] !== '') {
    $speciesId = filter_input(INPUT_GET, 'species_id', FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);
    if ($speciesId === false || $speciesId === null) {
        json_response(['ok' => false, 'message' => 'Select a valid species filter.'], 422);
    }
}
try {
    $clusters = (new ReportService(Database::connection()))->clustersForMap($user, [
        'health' => is_string($_GET['health'] ?? null) ? (string) $_GET['health'] : '',
        'species_id' => $speciesId,
        'q' => is_string($_GET['q'] ?? null) ? (string) $_GET['q'] : '',
    ]);
    json_response(['ok' => true, 'clusters' => $clusters]);
} catch (Throwable $exception) {
    error_log((string) $exception);
    json_response(['ok' => false, 'message' => 'Cluster data is temporarily unavailable.'], 500);
}
