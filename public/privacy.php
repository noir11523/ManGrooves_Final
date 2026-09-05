<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

render('privacy', [
    'pageTitle' => 'Privacy notice',
    'pageDescription' => 'How ManGROOVES handles guardian account details, precise locations, photos, and field observations.',
    'layout' => 'public',
]);
