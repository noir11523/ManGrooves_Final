<?php
declare(strict_types=1);
require_once __DIR__ . '/_init.php';
MobileApi::requireMethod('POST');
$user = MobileApi::requireUser();
if ($user['role'] !== 'guardian') json_response(['ok' => false, 'message' => 'Guardian access required.'], 403);
$input = MobileApi::input();
try {
    $observations = $input['observations'] ?? [];
    if (!is_array($observations)) throw new InvalidArgumentException('Choose your checklist answers.');
    $classification = (new App\Services\HealthClassifier(Database::connection()))->classify($observations);
    unset($classification['observations']);
    $traits = [];
    foreach (['root_type', 'leaf_shape', 'bark_texture'] as $key) $traits[$key] = mb_substr(scalar_string($input[$key] ?? null), 0, 255);
    $species = !in_array('', $traits, true) ? (new App\Services\SpeciesMatcher(Database::connection()))->match($traits) : null;
    json_response(['ok' => true, 'classification' => $classification, 'species' => $species]);
} catch (InvalidArgumentException $error) {
    json_response(['ok' => false, 'message' => $error->getMessage()], 422);
}
