<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::requireLogin();
$service = new ReportService(Database::connection());
$query = mb_substr(trim(is_string($_GET['q'] ?? null) ? (string) $_GET['q'] : ''), 0, 100);
$species = $service->speciesSearch($user, $query);

render('explore', [
    'pageTitle' => 'Explore mangroves',
    'user' => $user,
    'species' => $species,
    'query' => $query,
]);
