<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\ReportService;

MobileApi::requireMethod('POST');
$user = MobileApi::requireUser();
if (($user['role'] ?? '') !== 'guardian') {
    json_response(['ok' => false, 'message' => 'Only guardians can submit monitoring reports.'], 403);
}

try {
    $result = (new ReportService(Database::connection()))->submitGuardianReport(
        (int) $user['id'],
        $_POST,
        $_FILES['photo'] ?? []
    );
    json_response([
        'ok' => true,
        'message' => 'Report submitted for expert verification.',
        'report' => $result,
    ], 201);
} catch (InvalidArgumentException $exception) {
    json_response(['ok' => false, 'message' => $exception->getMessage()], 422);
} catch (RuntimeException $exception) {
    if ($exception instanceof PDOException) {
        error_log((string) $exception);
        json_response(['ok' => false, 'message' => 'The report could not be saved right now.'], 500);
    }
    json_response(['ok' => false, 'message' => $exception->getMessage()], 422);
}
