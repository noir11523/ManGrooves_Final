<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

use App\Services\ReportService;

MobileApi::requireMethod('GET');
$user = MobileApi::requireUser();
if (($user['role'] ?? '') !== 'guardian') {
    json_response(['ok' => false, 'message' => 'Only guardians can submit monitoring reports.'], 403);
}
$form = (new ReportService(Database::connection()))->formData($user);
json_response(['ok' => true] + $form);
