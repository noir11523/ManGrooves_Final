<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::user();
if (!$user) {
    json_response(['ok' => false, 'message' => 'Authentication required.'], 401);
}
if ($user['role'] !== 'guardian') {
    json_response(['ok' => false, 'message' => 'Only guardians can preview species matches.'], 403);
}
header('Cache-Control: private, no-store');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
}
$submittedToken = $_POST['csrf_token'] ?? null;
if (!is_string($submittedToken) || !Csrf::isValid($submittedToken)) {
    json_response(['ok' => false, 'message' => 'Your form session expired. Refresh and try again.'], 419);
}
$rawTraits = [
    'root_type' => $_POST['root_type'] ?? null,
    'leaf_shape' => $_POST['leaf_shape'] ?? null,
    'bark_texture' => $_POST['bark_texture'] ?? null,
];
foreach ($rawTraits as $rawTrait) {
    if ($rawTrait !== null && !is_string($rawTrait)) {
        json_response(['ok' => false, 'message' => 'Each species trait must be a single selection.'], 422);
    }
}
$traits = [
    'root_type' => trim((string) ($rawTraits['root_type'] ?? '')),
    'leaf_shape' => trim((string) ($rawTraits['leaf_shape'] ?? '')),
    'bark_texture' => trim((string) ($rawTraits['bark_texture'] ?? '')),
];
if (in_array('', $traits, true)) {
    json_response(['ok' => false, 'message' => 'Choose all three traits to preview a match.'], 422);
}
if (array_filter($traits, static fn (string $value): bool => mb_strlen($value) > 255)) {
    json_response(['ok' => false, 'message' => 'A species trait selection is too long.'], 422);
}
try {
    $result = (new ReportService(Database::connection()))->speciesMatch($traits);
    json_response(['ok' => true] + $result);
} catch (Throwable $exception) {
    error_log((string) $exception);
    json_response(['ok' => false, 'message' => 'The species preview is temporarily unavailable.'], 500);
}
