<?php

declare(strict_types=1);

$appName = (string) config('name', 'ManGROOVES');
$pageTitle = isset($pageTitle) && trim((string) $pageTitle) !== '' ? (string) $pageTitle : $appName;
$documentTitle = $pageTitle === $appName ? $appName : $pageTitle . ' | ' . $appName;
$pageDescription = isset($pageDescription) ? (string) $pageDescription : 'Community-powered mangrove monitoring and conservation.';
$bodyClass = isset($bodyClass) ? trim((string) $bodyClass) : '';
$viewName = isset($view) ? (string) $view : '';
$publicViews = ['home', 'auth/login', 'auth/register'];
$isPublicLayout = ($layout ?? null) === 'public' || in_array($viewName, $publicViews, true) || (!Auth::check() && str_starts_with($viewName, 'errors/'));
$authUser = Auth::user();
$unreadNotificationCount = 0;
$cssVersion = (string) (filemtime(APP_ROOT . '/public/assets/css/app.css') ?: 1);
$jsVersion = (string) (filemtime(APP_ROOT . '/public/assets/js/app.js') ?: 1);

if ($authUser) {
    try {
        $unreadStatement = Database::connection()->prepare(
            'SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL'
        );
        $unreadStatement->execute(['user_id' => (int) $authUser['id']]);
        $unreadNotificationCount = (int) $unreadStatement->fetchColumn();
    } catch (Throwable $exception) {
        if (config('debug')) {
            error_log('Unable to load unread notification count: ' . $exception->getMessage());
        }
    }
}

$flashes = consume_flashes();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="description" content="<?= e($pageDescription) ?>">
    <meta name="theme-color" content="#2D5A27">
    <meta name="color-scheme" content="light">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="ManGROOVES">
    <meta name="csrf-token" content="<?= e(Csrf::token()) ?>">
    <title><?= e($documentTitle) ?></title>
    <link rel="manifest" href="<?= e(url('manifest.webmanifest')) ?>">
    <link rel="icon" href="<?= e(asset('img/badges/app-icon.svg')) ?>" type="image/svg+xml">
    <link rel="apple-touch-icon" sizes="180x180" href="<?= e(asset('img/icons/app-icon-180.png')) ?>">
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" integrity="sha384-XGjxtQfXaH2tnPFa9x+ruJTuLE3Aa6LhHSWRr1XeTyhezb4abCG4ccI5AkVDxqC+" crossorigin="anonymous">
    <link href="<?= e(asset('css/app.css') . '?v=' . rawurlencode($cssVersion)) ?>" rel="stylesheet">
    <?= isset($extraHead) ? (string) $extraHead : '' ?>
</head>
<body class="<?= e(trim(($isPublicLayout ? 'public-layout ' : 'app-layout ') . $bodyClass)) ?>" data-app-base="<?= e(rtrim(url(), '/') . '/') ?>">
<a class="skip-link" href="#main-content">Skip to main content</a>

<div class="offline-banner" data-offline-banner role="status" aria-live="polite" hidden>
    <i class="bi bi-wifi-off" aria-hidden="true"></i>
    You are offline. Reconnect before opening pages or submitting field evidence.
</div>

<?php if ($isPublicLayout): ?>
    <?php require APP_ROOT . '/app/Views/partials/public-nav.php'; ?>
    <main id="main-content" tabindex="-1">
        <?php require APP_ROOT . '/app/Views/partials/flashes.php'; ?>
        <?= $content ?>
    </main>
    <?php require APP_ROOT . '/app/Views/partials/footer.php'; ?>
<?php else: ?>
    <div class="app-shell">
        <?php require APP_ROOT . '/app/Views/partials/sidebar.php'; ?>
        <div class="app-stage">
            <?php require APP_ROOT . '/app/Views/partials/topbar.php'; ?>
            <main id="main-content" class="app-main" tabindex="-1">
                <?php require APP_ROOT . '/app/Views/partials/flashes.php'; ?>
                <?= $content ?>
            </main>
            <?php require APP_ROOT . '/app/Views/partials/mobile-nav.php'; ?>
        </div>
    </div>
<?php endif; ?>

<div class="toast-container position-fixed bottom-0 end-0 p-3" aria-live="polite" aria-atomic="true" data-toast-container></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
<script src="<?= e(asset('js/app.js') . '?v=' . rawurlencode($jsVersion)) ?>"></script>
<?= isset($pageScripts) ? (string) $pageScripts : '' ?>
</body>
</html>
