<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('GET');
$viewer = MobileApi::requireUser();
$reportId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if (!$reportId || $reportId < 1) {
    http_response_code(404);
    exit;
}

$statement = Database::connection()->prepare('SELECT id, user_id, photo_path FROM reports WHERE id = :id LIMIT 1');
$statement->execute(['id' => $reportId]);
$report = $statement->fetch();
if (!$report || (($viewer['role'] ?? '') === 'guardian' && (int) $report['user_id'] !== (int) $viewer['id'])) {
    http_response_code(404);
    exit;
}

$relative = ltrim(str_replace('\\', '/', (string) $report['photo_path']), '/');
if (str_starts_with($relative, 'storage/uploads/')) {
    $root = realpath(APP_ROOT . '/storage/uploads');
    $candidate = realpath(APP_ROOT . '/' . $relative);
} elseif (str_starts_with($relative, 'assets/img/')) {
    $root = realpath(APP_ROOT . '/public/assets/img');
    $candidate = realpath(APP_ROOT . '/public/' . $relative);
} else {
    $root = false;
    $candidate = false;
}
if ($root === false || $candidate === false || !str_starts_with($candidate, $root . DIRECTORY_SEPARATOR)
    || !is_file($candidate) || !is_readable($candidate)) {
    http_response_code(404);
    exit;
}

$mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file($candidate);
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    http_response_code(404);
    exit;
}
header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($candidate));
header('Content-Disposition: inline; filename="report-photo"');
header('Cache-Control: private, no-store, max-age=0');
while (ob_get_level() > 0) {
    ob_end_clean();
}
readfile($candidate);
exit;
