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
try {
    $service = new ReportService(Database::connection());
    $query = is_string($_GET['q'] ?? null) ? (string) $_GET['q'] : '';
    $species = $service->speciesSearch($user, $query);
    $speciesId = filter_input(INPUT_GET, 'species_id', FILTER_VALIDATE_INT);
    if (array_key_exists('species_id', $_GET) && $_GET['species_id'] !== '' && !$speciesId) {
        json_response(['ok' => false, 'message' => 'Select a valid species.'], 422);
    }
    $clusters = $speciesId ? $service->clustersForMap($user, ['species_id' => (int) $speciesId]) : [];
    json_response(['ok' => true, 'species' => $species, 'clusters' => $clusters]);
} catch (Throwable $exception) {
    error_log((string) $exception);
    json_response(['ok' => false, 'message' => 'Species data is temporarily unavailable.'], 500);
}
