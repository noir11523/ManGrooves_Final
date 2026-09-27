<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/app/bootstrap.php';
$user = Auth::requireLogin();
$clusters = (new App\Services\ReportService(Database::connection()))->clustersForMap($user, $_GET);
$timelineView = in_array($_GET['view'] ?? '', ['health', 'growth'], true) ? $_GET['view'] : 'health';
render('clusters', ['pageTitle' => 'Clusters', 'clusters' => $clusters, 'timelineView' => $timelineView]);
