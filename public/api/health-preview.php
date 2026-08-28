<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::user();
if (!$user) {
    json_response(['ok' => false, 'message' => 'Authentication required.'], 401);
}
if ($user['role'] !== 'guardian') {
    json_response(['ok' => false, 'message' => 'Only guardians can preview report health.'], 403);
}
header('Cache-Control: private, no-store');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
}
$submittedToken = $_POST['csrf_token'] ?? null;
if (!is_string($submittedToken) || !Csrf::isValid($submittedToken)) {
    json_response(['ok' => false, 'message' => 'Your form session expired. Refresh and try again.'], 419);
}
try {
    $observations = $_POST['observations'] ?? [];
    if (!is_array($observations)) {
        throw new InvalidArgumentException('The checklist is not valid.');
    }
    $result = (new ReportService(Database::connection()))->healthPreview($observations);
    unset($result['observations']);
    json_response(['ok' => true, 'classification' => $result]);
} catch (InvalidArgumentException $exception) {
    json_response(['ok' => false, 'message' => $exception->getMessage()], 422);
} catch (Throwable $exception) {
    error_log((string) $exception);
    json_response(['ok' => false, 'message' => 'The health preview is temporarily unavailable.'], 500);
}
