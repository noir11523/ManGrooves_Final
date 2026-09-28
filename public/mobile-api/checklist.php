<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';

MobileApi::requireMethod('GET', 'POST');
$user = MobileApi::requireUser();
if ($user['role'] !== 'system_admin') json_response(['ok' => false, 'message' => 'Administrator access is required.'], 403);
$service = new \App\Services\ChecklistService(Database::connection());
if (is_post()) {
    try {
        $input = MobileApi::input();
        if (isset($input['payload'])) $input = json_decode(scalar_string($input['payload']), true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($input)) throw new InvalidArgumentException('Invalid checklist.');
        $service->save($user, $input, $_FILES);
    } catch (PDOException $error) {
        throw $error;
    } catch (InvalidArgumentException | JsonException | RuntimeException $error) {
        json_response(['ok' => false, 'message' => $error->getMessage()], 422);
    }
}
json_response(['ok' => true, 'criteria' => $service->data(), 'message' => is_post() ? 'Checklist saved. New reports use these settings.' : null]);
