<?php
declare(strict_types=1);
$cssVersion = substr(hash_file('sha256', APP_ROOT . '/assets/cloud/cloud.css'), 0, 12);
$scriptVersion = substr(hash_file('sha256', APP_ROOT . '/assets/cloud/cloud.js'), 0, 12);
$extraHead = '<link rel="stylesheet" href="' . e(asset('cloud/cloud.css') . '?v=' . $cssVersion) . '">';
$pageScripts = '<script type="module" src="' . e(asset('cloud/cloud.js') . '?v=' . $scriptVersion) . '"></script>';
$payload = json_encode(['page' => $cloudPage, 'query' => (object) $cloudQuery, 'user' => $cloudUser], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
?>
<div class="cloud-panel <?= $layout === 'public' ? 'cloud-public' : '' ?>" data-cloud-page="<?= e($payload) ?>">
    <div id="cloud-content" aria-live="polite"><p>Loading <?= e(strtolower($pageTitle)) ?>…</p></div>
    <noscript><p>Please enable JavaScript to use the forms and maps on this page.</p></noscript>
    <div id="toast" role="status" aria-live="polite" hidden></div>
    <dialog id="confirm" aria-labelledby="confirm-title" aria-describedby="confirm-body"><form method="dialog"><h2 id="confirm-title"></h2><p id="confirm-body"></p><div class="actions"><button value="cancel" class="outline">Back</button><button value="confirm">Confirm</button></div></form></dialog>
</div>
