<?php
declare(strict_types=1);

final class CloudRouter
{
    private const READ = ['configuration.php', 'explore.php', 'me.php', 'dashboard.php', 'profile.php', 'report-form.php', 'reports.php', 'report.php', 'previous-reports.php', 'clusters.php', 'cluster.php', 'verification.php', 'validation-history.php', 'checklist.php', 'analytics.php', 'badges.php', 'certificate-settings.php', 'expert-applications.php', 'notifications.php', 'users.php', 'species.php', 'sites.php', 'badge-settings.php', 'audit.php', 'places.php'];
    private const WRITE = ['send-registration-code.php', 'register.php', 'verify-email.php', 'resend-code.php', 'forgot-password.php', 'reset-password.php', 'complete-registration.php', 'profile.php', 'report-preview.php', 'review.php', 'certificate-link.php', 'expert-applications.php', 'notifications.php', 'users.php', 'species.php', 'sites.php', 'badge-settings.php'];
    private const PUBLIC_API = ['configuration.php', 'explore.php', 'send-registration-code.php', 'register.php', 'verify-email.php', 'resend-code.php', 'forgot-password.php', 'reset-password.php', 'complete-registration.php'];
    public static function dispatch(): void
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        if (!is_string($path) || str_contains($path, '%') || str_contains($path, '\\') || str_contains($path, '..')) throw new CloudError('Page not found.', 404);
        if ($path === '/cloud-api.php') { self::proxy(); return; }
        if ($path === '/cloud-session.php') { self::sessionAction(); return; }
        if ($path === '/logout.php') {
            if (!is_post()) throw new CloudError('Use the Sign out button.', 405);
            Csrf::validateOrFail();
            try { CloudClient::api('logout.php', body: []); } catch (CloudError $ignored) { }
            CloudSession::clear(); redirect('login.php');
        }
        if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) throw new CloudError('Method not allowed.', 405);
        if ($path === '/api/clusters.php') {
            $data = CloudClient::api(Auth::check() ? 'clusters.php' : 'explore.php', anonymous: !Auth::check());
            json_response($data);
        }
        if ($path === '/' || $path === '/index.php') {
            render('home', ['pageTitle' => 'ManGROOVES', 'bodyClass' => 'home-page', 'stats' => [], 'authUser' => Auth::user()]);
            return;
        }
        if ($path === '/privacy.php') {
            render('cloud/privacy', ['pageTitle' => 'Privacy notice', 'layout' => 'public']); return;
        }
        if ($path === '/certificate-verify.php') {
            $certificate = null; $verificationError = '';
            try { $result = CloudClient::api('certificate-verify.php', query: ['code' => scalar_string($_GET['code'] ?? '')], anonymous: true); $certificate = $result['certificate'] ?? null; }
            catch (CloudError $error) { $verificationError = $error->getMessage(); http_response_code($error->status); }
            render('cloud/certificate-verify', ['pageTitle' => 'Verify certificate', 'layout' => 'public', 'certificate' => $certificate, 'verificationError' => $verificationError]); return;
        }
        $public = ['/login.php' => ['login', 'Sign in'], '/register.php' => ['register', 'Create account'], '/forgot-password.php' => ['forgot-password', 'Reset password'], '/privacy.php' => ['privacy', 'Privacy notice'], '/explore.php' => ['explore', 'Explore mangrove sites']];
        if (isset($public[$path])) {
            [$page, $title] = $public[$path];
            if (Auth::check() && in_array($page, ['login', 'register'], true)) redirect('dashboard.php');
            self::page($page, $title, !Auth::check()); return;
        }
        $pages = [
            '/dashboard.php' => ['dashboard', 'Dashboard'], '/reports.php' => ['reports', 'Reports'],
            '/report-detail.php' => ['report', 'Report details'], '/submit-report.php' => ['submit', 'Submit Report'],
            '/analytics.php' => ['analytics', 'Analytics'], '/clusters.php' => ['clusters', 'Health history'],
            '/cluster.php' => ['cluster', 'Site visits'], '/report-map.php' => ['report-map', 'Report map'],
            '/settings.php' => ['profile', 'Profile settings'], '/notifications.php' => ['notifications', 'Notifications'],
            '/badges.php' => ['badges', 'My badges'], '/admin/verification.php' => ['verification', 'Review reports'],
            '/admin/report.php' => ['report', 'Report details'], '/admin/analytics.php' => ['analytics', 'Analytics'],
            '/admin/cluster.php' => ['cluster', 'Site visits'], '/admin/validation-history.php' => ['history', 'Review history'],
            '/admin/checklist.php' => ['checklist', 'Health checklist'], '/admin/users.php' => ['users', 'Users'],
            '/admin/species.php' => ['species', 'Species and Sites'], '/admin/badges.php' => ['badge-settings', 'Badge settings'],
            '/admin/audit.php' => ['audit', 'Audit log'], '/admin/expert-applications.php' => ['expert-applications', 'Expert applications'],
            '/admin/certificate-settings.php' => ['certificate-settings', 'Certificate signer'],
        ];
        if (!isset($pages[$path])) throw new CloudError('Page not found.', 404);
        [$page, $title] = $pages[$path];
        $user = Auth::requireLogin();
        if (in_array($page, ['submit', 'badges'], true)) Auth::requireRoles(['guardian', 'expert']);
        if (in_array($page, ['verification', 'history', 'species'], true)) Auth::requireRoles(['expert', 'system_admin']);
        if (in_array($page, ['checklist', 'users', 'badge-settings', 'audit', 'expert-applications', 'certificate-settings'], true)) Auth::requireRoles(['system_admin']);
        if ($page === 'reports' && isset($_GET['id'])) redirect('report-detail.php?id=' . (int) $_GET['id']);
        if ($page === 'dashboard') {
            $data = CloudClient::api('dashboard.php');
            foreach ($data['reminders'] as &$reminder) {
                $reminder['days_until_due'] = (int) (new DateTimeImmutable('today'))->diff(new DateTimeImmutable($reminder['next_followup_date']))->format('%r%a');
            }
            unset($reminder);
            render('dashboard', ['pageTitle' => $title, 'user' => $user, 'stats' => $data['stats'], 'latestReports' => $data['latest_reports'], 'reminders' => $data['reminders']]);
            return;
        }
        if ($page === 'clusters' && ($_GET['view'] ?? '') === 'growth') { $page = 'growth'; $title = 'Growth timeline'; }
        self::page($page, $title);
    }
    private static function page(string $page, string $title, bool $public = false): void
    {
        render('cloud/page', ['pageTitle' => $title, 'cloudPage' => $page, 'cloudQuery' => $_GET, 'cloudUser' => Auth::user(), 'layout' => $public ? 'public' : 'app']);
    }
    private static function body(): array
    {
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 524288) throw new CloudError('This form is too large.', 413);
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) throw new CloudError('Use a JSON request.', 415);
        $raw = file_get_contents('php://input', false, null, 0, 524289);
        if (strlen((string) $raw) > 524288) throw new CloudError('This form is too large.', 413);
        $body = json_decode((string) $raw, true);
        if (!is_array($body) || !str_starts_with(ltrim((string) $raw), '{')) throw new CloudError('Check the form and try again.');
        return $body;
    }
    private static function jsonAction(callable $action): never
    {
        try { json_response($action()); }
        catch (CloudError $error) { json_response(['ok' => false, 'message' => $error->getMessage()], $error->status); }
    }
    private static function proxy(): never
    {
        self::jsonAction(static function (): array {
            $route = scalar_string($_GET['route'] ?? '');
            $post = is_post();
            if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST'], true)) throw new CloudError('Method not allowed.', 405);
            if (!in_array($route, $post ? self::WRITE : self::READ, true)) throw new CloudError('Page not found.', 404);
            if ($post) Csrf::validateOrFail();
            $anonymous = in_array($route, self::PUBLIC_API, true);
            // The API checks the current account, revocation and role on every request.
            // Do not make a second me.php round trip before that authoritative check.
            if (!$anonymous && empty($_SESSION['access_token'])) throw new CloudError('Sign in to continue.', 401);
            $query = $_GET; unset($query['route']);
            $proof = $route === 'complete-registration.php' ? scalar_string($_SERVER['HTTP_X_REGISTRATION_PROOF'] ?? '') : null;
            if ($proof !== null && (strlen($proof) > 8000 || $proof === '' || preg_match('/[\r\n]/', $proof))) throw new CloudError('Verify your email again.', 401);
            return CloudClient::api($route, $query, $post ? self::body() : null, $anonymous, $proof);
        });
    }
    private static function sessionAction(): never
    {
        self::jsonAction(static function (): array {
            if (!is_post()) throw new CloudError('Method not allowed.', 405);
            Csrf::validateOrFail();
            $body = self::body();
            switch ($body['action'] ?? '') {
                case 'login':
                    $user = CloudClient::login(scalar_string($body['email'] ?? ''), scalar_string($body['password'] ?? ''));
                    return ['ok' => true, 'user' => $user, 'csrf' => Csrf::token()];
                case 'token':
                    if (!Auth::check()) throw new CloudError('Sign in to continue.', 401);
                    return ['ok' => true, 'access_token' => CloudClient::accessToken(), 'base' => CloudClient::projectUrl() . '/functions/v1/api/'];
                case 'password':
                    $user = Auth::user();
                    if (!$user) throw new CloudError('Sign in to continue.', 401);
                    $current = scalar_string($body['current'] ?? ''); $next = scalar_string($body['next'] ?? '');
                    if ($current === $next) throw new CloudError('Choose a different new password.');
                    if ($next !== ($body['confirmation'] ?? '')) throw new CloudError('The new passwords do not match.');
                    CloudClient::login($user['email'], $current);
                    CloudClient::api('account-security.php', body: ['action' => 'password', 'new_password' => $next, 'new_password_confirmation' => $body['confirmation']]);
                    CloudSession::clear();
                    return ['ok' => true, 'message' => 'Password changed. Sign in again.', 'csrf' => Csrf::token()];
                case 'logout':
                    try { CloudClient::api('logout.php', body: []); } catch (CloudError $ignored) { }
                    CloudSession::clear(); return ['ok' => true, 'csrf' => Csrf::token()];
                default: throw new CloudError('Page not found.', 404);
            }
        });
    }
}
