<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\VerificationService;

MobileApi::requireMethod('POST');
$user = MobileApi::requireUser();
if (!in_array($user['role'] ?? '', ['expert', 'system_admin'], true)) {
    json_response(['ok' => false, 'message' => 'Expert or administrator access is required.'], 403);
}

$input = MobileApi::input();
$reportId = filter_var($input['report_id'] ?? null, FILTER_VALIDATE_INT);
if (!$reportId || $reportId < 1) {
    json_response(['ok' => false, 'message' => 'Select a valid pending report.'], 422);
}

try {
    $result = (new VerificationService(Database::connection()))->review(
        (int) $reportId,
        (int) $user['id'],
        $input
    );
    json_response([
        'ok' => true,
        'message' => $result['status'] === 'verified'
            ? 'Report verified successfully.'
            : 'Report rejected and feedback sent.',
        'result' => $result,
    ]);
} catch (InvalidArgumentException $exception) {
    json_response(['ok' => false, 'message' => $exception->getMessage()], 422);
} catch (DomainException $exception) {
    json_response(['ok' => false, 'message' => $exception->getMessage()], 409);
}
