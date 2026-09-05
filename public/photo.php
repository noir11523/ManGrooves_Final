<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

$viewer = Auth::requireLogin();
$reportId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$reportId || $reportId < 1) {
    http_response_code(404);
    exit('Photo not found.');
}

$statement = Database::connection()->prepare(
    'SELECT id, user_id, photo_path FROM reports WHERE id = :id LIMIT 1'
);
$statement->execute(['id' => $reportId]);
$report = $statement->fetch();
if (!$report || (($viewer['role'] ?? '') === 'guardian' && (int) $report['user_id'] !== (int) $viewer['id'])) {
    http_response_code(404);
    exit('Photo not found.');
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

if ($root === false || $candidate === false
    || !str_starts_with($candidate, $root . DIRECTORY_SEPARATOR)
    || !is_file($candidate) || !is_readable($candidate)) {
    http_response_code(404);
    exit('Photo not found.');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = (string) $finfo->file($candidate);
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    http_response_code(404);
    exit('Photo not found.');
}

$extension = match ($mime) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    default => 'webp',
};
header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($candidate));
header('Content-Disposition: inline; filename="report-photo.' . $extension . '"');
header('Cache-Control: private, no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
while (ob_get_level() > 0) {
    ob_end_clean();
}
readfile($candidate);
exit;
