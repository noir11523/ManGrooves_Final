<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('GET');

$barangays = Database::connection()->query(
    'SELECT id, name, city_municipality, province FROM barangays ORDER BY name'
)->fetchAll();
foreach ($barangays as &$barangay) {
    $barangay['id'] = (int) $barangay['id'];
}
unset($barangay);

json_response([
    'ok' => true,
    'api_id' => 'org.mangrooves.mobile-api',
    'api_version' => 1,
    'app_name' => (string) config('name', 'ManGROOVES'),
    'barangays' => $barangays,
    'upload_max_mb' => (int) round((int) config('uploads.max_bytes', 5242880) / 1048576),
    'max_gps_accuracy_meters' => (int) config('gps_max_accuracy_meters', 100),
]);
