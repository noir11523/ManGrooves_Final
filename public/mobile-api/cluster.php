<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';
MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
$data = $id ? (new App\Services\ReportService(Database::connection()))->clusterTimeline((int) $id, $user) : null;
if (!$data) json_response(['ok' => false, 'message' => 'Cluster not found.'], 404);
foreach ($data['timeline'] as &$entry) {
    $entry['photo_url'] = !empty($entry['photo_path']) ? 'photo.php?id=' . (int) $entry['id'] : null;
    unset($entry['photo_path'], $entry['user_id']);
}
unset($entry);
json_response(['ok' => true] + $data);
