<?php

declare(strict_types=1);

/**
 * Full HTTP release journey against an isolated, disposable database.
 *
 * Usage:
 *   C:\xampp\php\php.exe tests\e2e_release.php
 */

final class JourneyStopped extends RuntimeException
{
}

final class HttpResult
{
    public function __construct(
        public readonly int $status,
        public readonly string $body,
        public readonly string $headers,
        public readonly string $contentType,
        public readonly ?string $location,
    ) {
    }
}

final class Browser
{
    private string $cookieJar;

    /** @var list<string> */
    private array $textResponses = [];

    /** @var list<string> */
    private array $seenSessionIds = [];

    public function __construct(private readonly string $baseUrl)
    {
        $cookieJar = tempnam(sys_get_temp_dir(), 'mgr-e2e-cookie-');
        if ($cookieJar === false) {
            throw new RuntimeException('Could not create an HTTP cookie jar.');
        }
        $this->cookieJar = $cookieJar;
    }

    /**
     * @param array<string,scalar|CURLFile|null>|null $fields
     * @param list<string> $headers
     */
    public function request(
        string $method,
        string $path,
        ?array $fields = null,
        bool $followRedirects = true,
        array $headers = []
    ): HttpResult {
        $handle = curl_init($this->baseUrl . $path);
        if ($handle === false) {
            throw new RuntimeException('Could not initialize cURL.');
        }

        $multipart = false;
        if ($fields !== null) {
            foreach ($fields as $value) {
                if ($value instanceof CURLFile) {
                    $multipart = true;
                    break;
                }
            }
        }

        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_FOLLOWLOCATION => $followRedirects,
            CURLOPT_MAXREDIRS => 8,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_COOKIEFILE => $this->cookieJar,
            CURLOPT_COOKIEJAR => $this->cookieJar,
            CURLOPT_USERAGENT => 'ManGROOVES-Release-E2E/1.0',
            CURLOPT_HTTPHEADER => $headers,
        ]);

        if (strtoupper($method) === 'POST') {
            curl_setopt($handle, CURLOPT_POST, true);
            if ($fields !== null) {
                curl_setopt(
                    $handle,
                    CURLOPT_POSTFIELDS,
                    $multipart ? $fields : http_build_query($fields, '', '&', PHP_QUERY_RFC3986)
                );
                if (!$multipart) {
                    curl_setopt($handle, CURLOPT_HTTPHEADER, array_merge(
                        $headers,
                        ['Content-Type: application/x-www-form-urlencoded']
                    ));
                }
            }
        } elseif (strtoupper($method) !== 'GET') {
            curl_setopt($handle, CURLOPT_CUSTOMREQUEST, strtoupper($method));
        }

        $raw = curl_exec($handle);
        if ($raw === false) {
            $message = curl_error($handle);
            curl_close($handle);
            throw new RuntimeException('HTTP request failed: ' . $message);
        }
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $headerSize = (int) curl_getinfo($handle, CURLINFO_HEADER_SIZE);
        $contentType = strtolower((string) curl_getinfo($handle, CURLINFO_CONTENT_TYPE));
        curl_close($handle);

        $this->seenSessionIds = array_values(array_unique(array_merge(
            $this->seenSessionIds,
            $this->cookieSessionIds()
        )));

        $headerText = substr($raw, 0, $headerSize);
        $body = substr($raw, $headerSize);
        $locations = [];
        preg_match_all('/^Location:\s*([^\r\n]+)/mi', $headerText, $locations);
        $location = $locations[1] === [] ? null : trim((string) end($locations[1]));

        if (str_starts_with($contentType, 'text/') || str_contains($contentType, 'json')) {
            $this->textResponses[] = $body;
        }

        return new HttpResult($status, $body, $headerText, $contentType, $location);
    }

    /** @return list<string> */
    public function textResponses(): array
    {
        return $this->textResponses;
    }

    /** @return list<string> */
    public function sessionIds(): array
    {
        return array_values(array_unique(array_merge($this->seenSessionIds, $this->cookieSessionIds())));
    }

    /** @return list<string> */
    private function cookieSessionIds(): array
    {
        if (!is_file($this->cookieJar)) {
            return [];
        }
        $ids = [];
        foreach (file($this->cookieJar, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            if (str_starts_with($line, '#HttpOnly_')) {
                $line = substr($line, strlen('#HttpOnly_'));
            } elseif ($line[0] === '#') {
                continue;
            }
            $parts = explode("\t", $line);
            if (count($parts) >= 7 && $parts[5] === 'mangrooves_session'
                && preg_match('/^[A-Za-z0-9,-]+$/', $parts[6])) {
                $ids[] = $parts[6];
            }
        }
        return array_values(array_unique($ids));
    }

    public function cleanup(): void
    {
        if (is_file($this->cookieJar)) {
            unlink($this->cookieJar);
        }
    }
}

$root = dirname(__DIR__);
$phpBin = 'C:\\xampp\\php\\php.exe';
$passed = 0;
$failed = 0;
$databaseName = 'mangrooves_e2e_' . getmypid() . '_' . bin2hex(random_bytes(3));
$serverPdo = null;
$databasePdo = null;
$serverProcess = null;
$serverStdout = tempnam(sys_get_temp_dir(), 'mgr-e2e-out-');
$serverStderr = tempnam(sys_get_temp_dir(), 'mgr-e2e-err-');
$browsers = [];
$uploadedPaths = [];
$uploadDirectories = [];
$registeredEmail = 'e2e.guardian.' . bin2hex(random_bytes(4)) . '@example.test';
$registeredPassword = 'E2eMangrove123!';

function record_result(bool $condition, string $name, string $detail = ''): bool
{
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo 'PASS  ' . $name . ($detail === '' ? '' : ' (' . $detail . ')') . PHP_EOL;
        return true;
    }
    $failed++;
    echo 'FAIL  ' . $name . ($detail === '' ? '' : ' (' . $detail . ')') . PHP_EOL;
    return false;
}

function require_result(bool $condition, string $name, string $detail = ''): void
{
    if (!record_result($condition, $name, $detail)) {
        throw new JourneyStopped($name . ($detail === '' ? '' : ': ' . $detail));
    }
}

function env_settings(string $path): array
{
    $values = [];
    if (!is_file($path)) {
        return $values;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if (strlen($value) >= 2 && (($value[0] === '"' && $value[-1] === '"')
            || ($value[0] === "'" && $value[-1] === "'"))) {
            $value = substr($value, 1, -1);
        }
        $values[$key] = $value;
    }
    return $values;
}

function setting(array $settings, string $key, string $default): string
{
    $environment = getenv($key);
    if ($environment !== false) {
        return (string) $environment;
    }
    return array_key_exists($key, $settings) ? (string) $settings[$key] : $default;
}

function csrf_token(string $html): string
{
    if (!preg_match('/name="csrf_token"\s+value="([a-f0-9]{64})"/i', $html, $match)) {
        throw new RuntimeException('CSRF token was not present in the HTML response.');
    }
    return $match[1];
}

function login(Browser $browser, string $email, string $password): HttpResult
{
    $page = $browser->request('GET', '/login.php');
    if ($page->status !== 200) {
        throw new RuntimeException('Login form returned HTTP ' . $page->status . '.');
    }
    return $browser->request('POST', '/login.php', [
        'csrf_token' => csrf_token($page->body),
        'email' => $email,
        'password' => $password,
    ]);
}

function report_payload(string $token, int $aliveCount, ?int $clusterId = null, ?int $parentId = null): array
{
    $payload = [
        'csrf_token' => $token,
        'MAX_FILE_SIZE' => '5242880',
        'cluster_id' => $clusterId === null ? '' : (string) $clusterId,
        'parent_report_id' => $parentId === null ? '' : (string) $parentId,
        'sitio_name' => $parentId === null ? 'E2E Release Plot' : 'E2E Release Plot Follow-up',
        'latitude' => '10.27900000',
        'longitude' => '123.87900000',
        'location_source' => 'manual',
        'location_accuracy' => '',
        'root_type' => $parentId === null ? 'Prop roots (stilt roots)' : 'Prop roots',
        'leaf_shape' => $parentId === null ? 'Elliptic' : 'Elliptic (with dark dots)',
        'bark_texture' => 'Rough, grayish to brown',
        'observed_alive_count' => (string) $aliveCount,
        'guardian_remarks' => $parentId === null
            ? 'Disposable release test observation with clear field evidence.'
            : 'Disposable release test follow-up observation.',
        'field_confirmation' => '1',
    ];
    if ($parentId === null) {
        $payload += [
            'observations[leaf_color]' => '1',
            'observations[leaf_condition]' => '4',
            'observations[pests]' => '8',
            'observations[roots]' => '11',
            'observations[bark_trunk]' => '15',
            'observations[bio_indicators][0]' => '19',
            'observations[bio_indicators][1]' => '20',
        ];
    } else {
        $payload += [
            'observations[leaf_color]' => '2',
            'observations[leaf_condition]' => '5',
            'observations[pests]' => '9',
            'observations[roots]' => '12',
            'observations[bark_trunk]' => '16',
            'observations[bio_indicators][0]' => '19',
        ];
    }
    return $payload;
}

try {
    require_result(is_file($phpBin), 'PHP runtime is available', $phpBin);
    require_result(extension_loaded('pdo_mysql') && extension_loaded('curl') && extension_loaded('fileinfo'),
        'required PHP extensions are available', 'pdo_mysql, curl, fileinfo');
    require_result((bool) preg_match('/^[a-z0-9_]+$/', $databaseName), 'disposable database name is safely scoped', $databaseName);

    $settings = env_settings($root . '/.env');
    $dbHost = setting($settings, 'DB_HOST', '127.0.0.1');
    $dbPort = (int) setting($settings, 'DB_PORT', '3306');
    $dbUser = setting($settings, 'DB_USERNAME', 'root');
    $dbPassword = setting($settings, 'DB_PASSWORD', '');

    $serverPdo = new PDO(
        sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $dbHost, $dbPort),
        $dbUser,
        $dbPassword,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => true]
    );
    $serverPdo->exec("CREATE DATABASE `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $serverPdo->exec("USE `{$databaseName}`");
    $serverPdo->exec((string) file_get_contents($root . '/database/schema.sql'));
    $serverPdo->exec((string) file_get_contents($root . '/database/seed.sql'));
    record_result(true, 'fresh schema and development seed import', $databaseName);

    require_result(
        (int) $serverPdo->query('SELECT COUNT(*) FROM users')->fetchColumn() === 5
        && (int) $serverPdo->query('SELECT COUNT(*) FROM mangrove_species')->fetchColumn() === 7
        && (int) $serverPdo->query('SELECT COUNT(*) FROM reports')->fetchColumn() === 6,
        'fresh seed has expected reference and journey fixtures', '5 users, 7 species, 6 reports'
    );

    $serverPdo->exec('ALTER TABLE notifications DROP INDEX uq_notifications_dedupe, DROP COLUMN dedupe_key');
    $serverPdo->exec('ALTER TABLE users DROP COLUMN session_version');
    $serverPdo->exec(
        'ALTER TABLE user_badges
         DROP COLUMN badge_name_snapshot, DROP COLUMN description_snapshot,
         DROP COLUMN metric_snapshot, DROP COLUMN target_value_snapshot,
         DROP COLUMN image_path_snapshot'
    );
    $serverPdo->exec(
        'ALTER TABLE report_observations
         DROP COLUMN criteria_code_snapshot, DROP COLUMN criterion_name_snapshot,
         DROP COLUMN score_group_snapshot, DROP COLUMN selection_mode_snapshot,
         DROP COLUMN option_code_snapshot, DROP COLUMN option_label_snapshot,
         DROP COLUMN criteria_order_snapshot, DROP COLUMN option_order_snapshot'
    );
    $serverPdo->exec((string) file_get_contents($root . '/database/schema.sql'));
    $serverPdo->exec((string) file_get_contents($root . '/database/seed.sql'));

    $restoredColumns = (int) $serverPdo->query(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND (
            (TABLE_NAME = 'users' AND COLUMN_NAME = 'session_version')
            OR (TABLE_NAME = 'notifications' AND COLUMN_NAME = 'dedupe_key')
            OR (TABLE_NAME = 'user_badges' AND COLUMN_NAME IN
                ('badge_name_snapshot','description_snapshot','metric_snapshot','target_value_snapshot','image_path_snapshot'))
            OR (TABLE_NAME = 'report_observations' AND COLUMN_NAME IN
                ('criteria_code_snapshot','criterion_name_snapshot','score_group_snapshot','selection_mode_snapshot',
                 'option_code_snapshot','option_label_snapshot','criteria_order_snapshot','option_order_snapshot'))
         )"
    )->fetchColumn();
    require_result($restoredColumns === 15, 'in-place compatibility migration restores all newer columns', $restoredColumns . '/15');
    require_result(
        (int) $serverPdo->query(
            "SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
               AND INDEX_NAME = 'uq_notifications_dedupe'"
        )->fetchColumn() === 1,
        'compatibility migration restores notification dedupe index'
    );
    require_result(
        (int) $serverPdo->query(
            'SELECT COUNT(*) FROM report_observations
             WHERE criteria_code_snapshot IS NULL OR criterion_name_snapshot IS NULL
                OR option_code_snapshot IS NULL OR option_label_snapshot IS NULL'
        )->fetchColumn() === 0
        && (int) $serverPdo->query(
            'SELECT COUNT(*) FROM user_badges
             WHERE badge_name_snapshot IS NULL OR description_snapshot IS NULL
                OR metric_snapshot IS NULL OR target_value_snapshot IS NULL'
        )->fetchColumn() === 0,
        'compatibility migration backfills historical observation and badge snapshots'
    );
    record_result(true, 'schema and seed can be rerun idempotently');

    $databasePdo = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $dbHost, $dbPort, $databaseName),
        $dbUser,
        $dbPassword,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );

    $port = random_int(18000, 19999);
    for ($attempt = 0; $attempt < 20; $attempt++, $port++) {
        $socket = @fsockopen('127.0.0.1', $port, $errorCode, $errorMessage, 0.1);
        if ($socket === false) {
            break;
        }
        fclose($socket);
    }
    $environment = getenv();
    if (!is_array($environment)) {
        $environment = [];
    }
    $environment += [
        'SystemRoot' => getenv('SystemRoot') ?: 'C:\\Windows',
        'PATH' => getenv('PATH') ?: '',
    ];
    $environment['APP_ENV'] = 'testing';
    $environment['APP_DEBUG'] = 'true';
    $environment['APP_URL'] = '';
    $environment['DB_HOST'] = $dbHost;
    $environment['DB_PORT'] = (string) $dbPort;
    $environment['DB_DATABASE'] = $databaseName;
    $environment['DB_USERNAME'] = $dbUser;
    $environment['DB_PASSWORD'] = $dbPassword;

    // Array form bypasses cmd.exe so proc_terminate() targets the PHP server
    // itself and cannot leave a detached listener behind after cleanup.
    $command = [
        $phpBin,
        '-d',
        'upload_tmp_dir=' . sys_get_temp_dir(),
        '-S',
        '127.0.0.1:' . $port,
        '-t',
        $root . '/public',
    ];
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['file', $serverStdout, 'a'],
        2 => ['file', $serverStderr, 'a'],
    ];
    $serverProcess = proc_open($command, $descriptors, $pipes, $root, $environment);
    if (!is_resource($serverProcess)) {
        throw new RuntimeException('Could not launch the isolated PHP development server.');
    }
    fclose($pipes[0]);
    $baseUrl = 'http://127.0.0.1:' . $port;
    $ready = false;
    for ($attempt = 0; $attempt < 50; $attempt++) {
        $socket = @fsockopen('127.0.0.1', $port, $errorCode, $errorMessage, 0.2);
        if ($socket !== false) {
            fclose($socket);
            $ready = true;
            break;
        }
        usleep(100000);
    }
    require_result($ready, 'isolated PHP server starts', $baseUrl);

    $anonymous = new Browser($baseUrl);
    $browsers[] = $anonymous;
    $home = $anonymous->request('GET', '/');
    require_result($home->status === 200 && str_contains($home->body, 'ManGROOVES'), 'anonymous landing page loads', 'HTTP ' . $home->status);
    $anonymousApi = $anonymous->request('GET', '/api/clusters.php', null, false);
    record_result($anonymousApi->status === 401, 'anonymous API access is denied', 'HTTP ' . $anonymousApi->status);
    $anonymousDashboard = $anonymous->request('GET', '/dashboard.php', null, false);
    record_result($anonymousDashboard->status === 302 && $anonymousDashboard->location === '/login.php',
        'anonymous browser route redirects to login', 'HTTP ' . $anonymousDashboard->status . ', Location ' . ($anonymousDashboard->location ?? 'none'));
    $poisonedHost = $anonymous->request('GET', '/dashboard.php', null, false, ['Host: attacker.example', 'X-Forwarded-Host: attacker.example']);
    record_result(
        $poisonedHost->status === 302 && $poisonedHost->location === '/login.php'
        && !str_contains(strtolower($poisonedHost->headers), 'attacker.example/login'),
        'Host headers cannot poison redirect targets', 'Location ' . ($poisonedHost->location ?? 'none')
    );

    $guardian = new Browser($baseUrl);
    $browsers[] = $guardian;
    $registerPage = $guardian->request('GET', '/register.php');
    $registerToken = csrf_token($registerPage->body);
    record_result($registerPage->status === 200 && str_contains(strtolower($registerPage->body), 'privacy notice'),
        'registration form exposes privacy consent and CSRF', 'HTTP ' . $registerPage->status);
    $registration = $guardian->request('POST', '/register.php', [
        'csrf_token' => $registerToken,
        'full_name' => 'E2E Release Guardian',
        'email' => $registeredEmail,
        'phone' => '+63 917 000 0000',
        'barangay_id' => '1',
        'password' => $registeredPassword,
        'password_confirmation' => $registeredPassword,
        'privacy_consent' => '1',
        'role' => 'system_admin',
    ]);
    require_result($registration->status === 200 && str_contains($registration->body, 'Dashboard'),
        'guardian registration signs in to dashboard', 'HTTP ' . $registration->status);
    $registeredUser = $databasePdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $registeredUser->execute(['email' => $registeredEmail]);
    $guardianRow = $registeredUser->fetch();
    require_result(
        (bool) $guardianRow && $guardianRow['role'] === 'guardian' && $guardianRow['privacy_consent_at'] !== null,
        'public registration ignores role escalation and creates an active consented guardian'
    );
    $guardianId = (int) $guardianRow['id'];

    $reportForm = $guardian->request('GET', '/submit-report.php');
    $reportToken = csrf_token($reportForm->body);
    record_result(
        $reportForm->status === 200
        && preg_match('/name="observed_alive_count"[^>]*required/i', $reportForm->body) === 1,
        'report wizard requires the living-count baseline', 'HTTP ' . $reportForm->status
    );
    $beforeReports = (int) $databasePdo->query('SELECT COUNT(*) FROM reports')->fetchColumn();
    $invalidCsrf = $guardian->request('POST', '/submit-report.php', ['csrf_token' => 'invalid'], false);
    record_result(
        $invalidCsrf->status === 419 && (int) $databasePdo->query('SELECT COUNT(*) FROM reports')->fetchColumn() === $beforeReports,
        'invalid report CSRF is rejected without mutation', 'HTTP ' . $invalidCsrf->status
    );
    $healthPreview = $guardian->request('POST', '/api/health-preview.php', [
        'csrf_token' => $reportToken,
        'observations[leaf_color]' => '1',
        'observations[leaf_condition]' => '4',
        'observations[pests]' => '8',
        'observations[roots]' => '11',
        'observations[bark_trunk]' => '15',
    ]);
    record_result($healthPreview->status === 200 && str_contains($healthPreview->body, 'Healthy'),
        'valid CSRF health preview succeeds', 'HTTP ' . $healthPreview->status);
    $invalidPreview = $guardian->request('POST', '/api/health-preview.php', ['csrf_token' => 'invalid'], false);
    record_result($invalidPreview->status === 419, 'API rejects invalid CSRF', 'HTTP ' . $invalidPreview->status);

    $fixture = $root . '/public/assets/img/guides/leaf-color.png';
    require_result(is_file($fixture), 'real PNG upload fixture is available');
    $firstPayload = report_payload($reportToken, 12);
    $firstPayload['photo'] = new CURLFile($fixture, 'image/png', 'field-evidence.png');
    $firstSubmission = $guardian->request('POST', '/submit-report.php', $firstPayload);
    require_result(
        $firstSubmission->status === 200 && str_contains($firstSubmission->body, 'submitted for expert verification'),
        'guardian submits an actual-photo report', 'HTTP ' . $firstSubmission->status
    );
    $firstStatement = $databasePdo->prepare('SELECT * FROM reports WHERE user_id = :user_id ORDER BY id DESC LIMIT 1');
    $firstStatement->execute(['user_id' => $guardianId]);
    $firstReport = $firstStatement->fetch();
    require_result(
        (bool) $firstReport && $firstReport['status'] === 'pending'
        && (int) $firstReport['observed_alive_count'] === 12
        && str_starts_with((string) $firstReport['photo_path'], 'storage/uploads/reports/'),
        'pending report stores a positive baseline and private photo path'
    );
    $firstReportId = (int) $firstReport['id'];
    $uploadedPaths[] = (string) $firstReport['photo_path'];
    record_result(
        (int) $databasePdo->query('SELECT COUNT(*) FROM report_observations WHERE report_id = ' . $firstReportId)->fetchColumn() === 7,
        'complete health checklist is stored with snapshots', '7 observation rows'
    );
    record_result(
        (int) $databasePdo->query(
            "SELECT COUNT(*) FROM audit_logs WHERE action = 'report.submitted'"
            . " AND entity_type = 'report' AND entity_id = '" . $firstReportId . "'"
        )->fetchColumn() === 1,
        'report submission commits its required audit row'
    );
    $ownPhoto = $guardian->request('GET', '/photo.php?id=' . $firstReportId);
    record_result(
        $ownPhoto->status === 200 && str_starts_with($ownPhoto->contentType, 'image/png') && strlen($ownPhoto->body) > 100000,
        'guardian can read own protected evidence photo', 'HTTP ' . $ownPhoto->status
    );
    $foreignApi = $guardian->request('GET', '/api/report-detail.php?id=1', null, false);
    record_result($foreignApi->status === 404, 'guardian API report IDOR is denied', 'HTTP ' . $foreignApi->status);
    $ownApi = $guardian->request('GET', '/api/report-detail.php?id=' . $firstReportId);
    $ownApiJson = json_decode($ownApi->body, true);
    record_result(
        $ownApi->status === 200 && is_array($ownApiJson)
        && isset($ownApiJson['report']['photo_url'])
        && !array_key_exists('photo_path', $ownApiJson['report'])
        && !array_key_exists('photo_sha256', $ownApiJson['report']),
        'report API exposes an authorized photo URL without storage metadata', 'HTTP ' . $ownApi->status
    );
    $preBadgeCertificate = $guardian->request('GET', '/certificate.php', null, false);
    record_result($preBadgeCertificate->status === 403, 'certificate is gated before a badge is earned', 'HTTP ' . $preBadgeCertificate->status);

    $expert = new Browser($baseUrl);
    $browsers[] = $expert;
    $expertLogin = login($expert, 'expert@test.com', 'Mangrooves123!');
    require_result($expertLogin->status === 200 && str_contains($expertLogin->body, 'Dashboard'),
        'expert signs in', 'HTTP ' . $expertLogin->status);
    $expertEvidence = $expert->request('GET', '/photo.php?id=' . $firstReportId);
    record_result($expertEvidence->status === 200 && str_starts_with($expertEvidence->contentType, 'image/png'),
        'expert can read protected evidence', 'HTTP ' . $expertEvidence->status);
    $reviewPage = $expert->request('GET', '/admin/report.php?id=' . $firstReportId);
    $reviewToken = csrf_token($reviewPage->body);
    require_result($reviewPage->status === 200 && str_contains($reviewPage->body, 'Expert decision'),
        'expert opens submitted report for review', 'HTTP ' . $reviewPage->status);
    $correction = $expert->request('POST', '/admin/report.php', [
        'csrf_token' => $reviewToken,
        'report_id' => (string) $firstReportId,
        'action' => 'correct',
        'final_health' => 'Stressed',
        'final_species_id' => '6',
        'rarity_level' => 'Vulnerable',
        'needs_attention' => '1',
        'expert_feedback' => 'E2E correction: monitor leaf stress and remove nearby debris.',
    ]);
    require_result($correction->status === 200 && str_contains($correction->body, 'Verification history'),
        'expert correction completes and returns to history', 'HTTP ' . $correction->status);
    $firstStatement->execute(['user_id' => $guardianId]);
    $firstReport = $firstStatement->fetch();
    $clusterId = (int) ($firstReport['cluster_id'] ?? 0);
    $clusterStatement = $databasePdo->prepare('SELECT * FROM mangrove_clusters WHERE id = :id');
    $clusterStatement->execute(['id' => $clusterId]);
    $cluster = $clusterStatement->fetch();
    require_result(
        $firstReport['status'] === 'verified' && $firstReport['final_health'] === 'Stressed'
        && (int) $firstReport['final_species_id'] === 6 && $firstReport['rarity_level'] === 'Vulnerable'
        && (int) $firstReport['needs_attention'] === 1 && $clusterId > 3,
        'expert correction persists final health, species, rarity, attention, and cluster'
    );
    record_result(
        (bool) $cluster && (int) $cluster['initial_seedlings'] === 12 && (int) $cluster['verified_count'] === 1,
        'new cluster uses the report baseline', 'initial 12, verified 1'
    );
    record_result(
        (int) $databasePdo->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'report.correct' AND entity_id = '" . $firstReportId . "'")->fetchColumn() === 1
        && (int) $databasePdo->query('SELECT COUNT(*) FROM verification_logs WHERE report_id = ' . $firstReportId)->fetchColumn() === 1,
        'verification and audit logs are committed atomically'
    );
    $expertAnalytics = $expert->request('GET', '/admin/analytics.php');
    record_result(
        $expertAnalytics->status === 200
        && str_contains($expertAnalytics->body, 'Health distribution')
        && str_contains($expertAnalytics->body, 'High-risk and attention-flagged reports')
        && !str_contains($expertAnalytics->body, 'Overall survival')
        && !str_contains($expertAnalytics->body, 'Print / Save PDF')
        && !str_contains($expertAnalytics->body, 'Cluster survival'),
        'expert analytics follows Appendix H without survival or PDF export',
        'HTTP ' . $expertAnalytics->status
    );
    $expertCluster = $expert->request('GET', '/admin/cluster.php?id=' . $clusterId);
    record_result(
        $expertCluster->status === 200
        && str_contains($expertCluster->body, 'Observation timeline')
        && str_contains($expertCluster->body, 'photo.php?id=' . $firstReportId)
        && !str_contains($expertCluster->body, 'Latest survival')
        && !str_contains($expertCluster->body, 'Survival trend'),
        'expert cluster timeline shows protected photo evidence and omits administrator-only survival',
        'HTTP ' . $expertCluster->status
    );
    $expertMobile = new Browser($baseUrl);
    $browsers[] = $expertMobile;
    $expertMobileLogin = $expertMobile->request('POST', '/mobile-api/login.php', [
        'email' => 'expert@test.com',
        'password' => 'Mangrooves123!',
        'device_name' => 'Appendix H expert test',
    ]);
    $expertMobileLoginJson = json_decode($expertMobileLogin->body, true);
    $expertToken = is_array($expertMobileLoginJson) ? (string) ($expertMobileLoginJson['token'] ?? '') : '';
    $expertMobileAnalytics = $expertMobile->request(
        'GET',
        '/mobile-api/analytics.php',
        null,
        true,
        ['Authorization: Bearer ' . $expertToken]
    );
    $expertMobileJson = json_decode($expertMobileAnalytics->body, true);
    $expertMobileData = is_array($expertMobileJson) ? ($expertMobileJson['analytics'] ?? []) : [];
    $expertGrowthPoint = is_array($expertMobileData['growth'] ?? null) ? ($expertMobileData['growth'][0] ?? []) : [];
    $expertMapPoint = is_array($expertMobileData['map'] ?? null) ? ($expertMobileData['map'][0] ?? []) : [];
    record_result(
        $expertMobileAnalytics->status === 200
        && ($expertMobileData['capabilities']['can_view_survival'] ?? null) === false
        && !array_key_exists('overall_survival', $expertMobileData)
        && !array_key_exists('survival_rate', is_array($expertGrowthPoint) ? $expertGrowthPoint : [])
        && !array_key_exists('survival', is_array($expertMapPoint) ? $expertMapPoint : []),
        'expert mobile analytics payload excludes computed survival fields',
        'HTTP ' . $expertMobileAnalytics->status
    );

    foreach (['/admin/users.php', '/admin/species.php', '/admin/badges.php', '/admin/audit.php'] as $path) {
        $denied = $expert->request('GET', $path, null, false);
        record_result($denied->status === 403, 'expert denied system-admin route ' . $path, 'HTTP ' . $denied->status);
    }

    $otherGuardian = new Browser($baseUrl);
    $browsers[] = $otherGuardian;
    $otherLogin = login($otherGuardian, 'guardian@test.com', 'Mangrooves123!');
    require_result($otherLogin->status === 200 && str_contains($otherLogin->body, 'Dashboard'),
        'second guardian signs in for IDOR checks', 'HTTP ' . $otherLogin->status);
    $foreignPhoto = $otherGuardian->request('GET', '/photo.php?id=' . $firstReportId, null, false);
    record_result($foreignPhoto->status === 404, 'another guardian cannot read private evidence', 'HTTP ' . $foreignPhoto->status);

    $guardianNotifications = $guardian->request('GET', '/notifications.php');
    record_result(
        $guardianNotifications->status === 200
        && str_contains($guardianNotifications->body, 'Report verified')
        && str_contains($guardianNotifications->body, 'Badge earned: First Report'),
        'guardian receives verification and badge notifications', 'HTTP ' . $guardianNotifications->status
    );
    $guardianReport = $guardian->request('GET', '/report-detail.php?id=' . $firstReportId);
    record_result(
        $guardianReport->status === 200 && str_contains($guardianReport->body, 'E2E correction')
        && str_contains($guardianReport->body, 'Stressed'),
        'guardian sees corrected report and expert feedback', 'HTTP ' . $guardianReport->status
    );
    $guardianCluster = $guardian->request('GET', '/cluster.php?id=' . $clusterId);
    record_result($guardianCluster->status === 200 && str_contains($guardianCluster->body, 'E2E Release Plot'),
        'guardian can access assigned cluster timeline', 'HTTP ' . $guardianCluster->status);
    $guardianBadges = $guardian->request('GET', '/badges.php');
    record_result($guardianBadges->status === 200 && str_contains($guardianBadges->body, 'First Report'),
        'guardian badge page shows earned badge', 'HTTP ' . $guardianBadges->status);
    $guardianCertificate = $guardian->request('GET', '/certificate.php');
    record_result(
        $guardianCertificate->status === 200 && str_contains($guardianCertificate->body, 'E2E Release Guardian')
        && str_contains($guardianCertificate->body, 'First Report'),
        'guardian certificate becomes available after verification', 'HTTP ' . $guardianCertificate->status
    );
    $guardianDenied = $guardian->request('GET', '/admin/verification.php', null, false);
    record_result($guardianDenied->status === 403, 'guardian is denied expert verification', 'HTTP ' . $guardianDenied->status);

    $followupPage = $guardian->request('GET', '/submit-report.php?parent=' . $firstReportId);
    $followupToken = csrf_token($followupPage->body);
    require_result(
        $followupPage->status === 200 && str_contains($followupPage->body, 'E2E Release Plot'),
        'verified report is offered as a follow-up parent', 'HTTP ' . $followupPage->status
    );
    $followupFixture = $root . '/public/assets/img/guides/leaf-condition.png';
    require_result(is_file($followupFixture), 'distinct follow-up PNG fixture is available');
    $followupPayload = report_payload($followupToken, 10, $clusterId, $firstReportId);
    $followupPayload['photo'] = new CURLFile($followupFixture, 'image/png', 'followup-evidence.png');
    $followupSubmission = $guardian->request('POST', '/submit-report.php', $followupPayload);
    require_result(
        $followupSubmission->status === 200 && str_contains($followupSubmission->body, 'submitted for expert verification'),
        'guardian submits actual-photo follow-up', 'HTTP ' . $followupSubmission->status
    );
    $followupStatement = $databasePdo->prepare(
        'SELECT * FROM reports WHERE user_id = :user_id AND parent_report_id = :parent_id ORDER BY id DESC LIMIT 1'
    );
    $followupStatement->execute(['user_id' => $guardianId, 'parent_id' => $firstReportId]);
    $followup = $followupStatement->fetch();
    require_result(
        (bool) $followup && $followup['status'] === 'pending'
        && (int) $followup['cluster_id'] === $clusterId && (int) $followup['observed_alive_count'] === 10,
        'follow-up keeps its parent cluster and latest alive count'
    );
    $followupId = (int) $followup['id'];
    $uploadedPaths[] = (string) $followup['photo_path'];

    $followupReviewPage = $expert->request('GET', '/admin/report.php?id=' . $followupId);
    $followupReviewToken = csrf_token($followupReviewPage->body);
    $followupReview = $expert->request('POST', '/admin/report.php', [
        'csrf_token' => $followupReviewToken,
        'report_id' => (string) $followupId,
        'action' => 'confirm',
        'expert_feedback' => 'E2E follow-up confirmed with improved survival evidence.',
    ]);
    require_result($followupReview->status === 200 && str_contains($followupReview->body, 'Verification history'),
        'expert confirms follow-up', 'HTTP ' . $followupReview->status);
    $followupStatement->execute(['user_id' => $guardianId, 'parent_id' => $firstReportId]);
    $followup = $followupStatement->fetch();
    $clusterStatement->execute(['id' => $clusterId]);
    $cluster = $clusterStatement->fetch();
    record_result(
        $followup['status'] === 'verified' && (int) $followup['cluster_id'] === $clusterId
        && (int) $cluster['initial_seedlings'] === 12 && (int) $cluster['verified_count'] === 2,
        'verified follow-up preserves baseline and refreshes cluster count'
    );
    record_result(
        (int) $databasePdo->query(
            'SELECT COUNT(*) FROM user_badges WHERE user_id = ' . $guardianId . ' AND badge_id = 1'
        )->fetchColumn() === 1,
        'badge award remains idempotent across later verification'
    );

    $rejectedReportPage = $guardian->request('GET', '/submit-report.php');
    $rejectedPayload = report_payload(csrf_token($rejectedReportPage->body), 9, $clusterId);
    $rejectedFixture = $root . '/public/assets/img/guides/bark.png';
    require_result(is_file($rejectedFixture), 'distinct rejection-path PNG fixture is available');
    $rejectedPayload['photo'] = new CURLFile($rejectedFixture, 'image/png', 'rejected-evidence.png');
    $rejectedSubmission = $guardian->request('POST', '/submit-report.php', $rejectedPayload);
    require_result(
        $rejectedSubmission->status === 200 && str_contains($rejectedSubmission->body, 'submitted for expert verification'),
        'guardian submits a report for rejection-path testing',
        'HTTP ' . $rejectedSubmission->status
    );
    $firstStatement->execute(['user_id' => $guardianId]);
    $rejectedReport = $firstStatement->fetch();
    $rejectedReportId = (int) $rejectedReport['id'];
    $uploadedPaths[] = (string) $rejectedReport['photo_path'];
    $rejectionPage = $expert->request('GET', '/admin/report.php?id=' . $rejectedReportId);
    $rejection = $expert->request('POST', '/admin/report.php', [
        'csrf_token' => csrf_token($rejectionPage->body),
        'report_id' => (string) $rejectedReportId,
        'action' => 'reject',
        'expert_feedback' => 'The photo is too distant for reliable health validation. Please submit a closer image.',
    ]);
    $firstStatement->execute(['user_id' => $guardianId]);
    $rejectedReport = $firstStatement->fetch();
    record_result(
        $rejection->status === 200 && $rejectedReport['status'] === 'rejected'
        && str_contains((string) $rejectedReport['expert_feedback'], 'closer image')
        && (int) $databasePdo->query('SELECT COUNT(*) FROM verification_logs WHERE action = \'reject\' AND report_id = ' . $rejectedReportId)->fetchColumn() === 1,
        'expert rejects a report with actionable feedback and validation history',
        'HTTP ' . $rejection->status
    );

    $admin = new Browser($baseUrl);
    $browsers[] = $admin;
    $adminLogin = login($admin, 'admin@test.com', 'Mangrooves123!');
    require_result($adminLogin->status === 200 && str_contains($adminLogin->body, 'Dashboard'),
        'system administrator signs in', 'HTTP ' . $adminLogin->status);
    $adminRoutes = [
        '/admin/analytics.php' => 'Conservation analytics',
        '/admin/verification.php' => 'Verification queue',
        '/admin/cluster.php' => 'Mangrove clusters',
        '/admin/cluster.php?id=' . $clusterId => 'E2E Release Plot',
        '/admin/report.php?id=' . $firstReportId => 'E2E Release Guardian',
        '/admin/users.php' => 'User management',
        '/admin/species.php' => 'Species management',
        '/admin/badges.php' => 'Badge management',
        '/admin/audit.php' => 'Audit log',
    ];
    foreach ($adminRoutes as $path => $needle) {
        $adminPage = $admin->request('GET', $path);
        record_result($adminPage->status === 200 && str_contains($adminPage->body, $needle),
            'administrator route ' . $path, 'HTTP ' . $adminPage->status);
    }
    $adminAnalytics = $admin->request('GET', '/admin/analytics.php');
    record_result(
        $adminAnalytics->status === 200
        && str_contains($adminAnalytics->body, 'Overall survival')
        && str_contains($adminAnalytics->body, 'Cluster survival')
        && str_contains($adminAnalytics->body, 'Print / Save PDF'),
        'administrator receives survival analytics and PDF export',
        'HTTP ' . $adminAnalytics->status
    );
    $adminMobile = new Browser($baseUrl);
    $browsers[] = $adminMobile;
    $adminMobileLogin = $adminMobile->request('POST', '/mobile-api/login.php', [
        'email' => 'admin@test.com',
        'password' => 'Mangrooves123!',
        'device_name' => 'Appendix H admin test',
    ]);
    $adminMobileLoginJson = json_decode($adminMobileLogin->body, true);
    $adminToken = is_array($adminMobileLoginJson) ? (string) ($adminMobileLoginJson['token'] ?? '') : '';
    $adminMobileAnalytics = $adminMobile->request(
        'GET',
        '/mobile-api/analytics.php',
        null,
        true,
        ['Authorization: Bearer ' . $adminToken]
    );
    $adminMobileJson = json_decode($adminMobileAnalytics->body, true);
    $adminMobileData = is_array($adminMobileJson) ? ($adminMobileJson['analytics'] ?? []) : [];
    record_result(
        $adminMobileAnalytics->status === 200
        && ($adminMobileData['capabilities']['can_view_survival'] ?? null) === true
        && array_key_exists('overall_survival', $adminMobileData),
        'administrator mobile analytics payload includes computed survival',
        'HTTP ' . $adminMobileAnalytics->status
    );
    $adminUsers = $admin->request('GET', '/admin/users.php');
    record_result(
        str_contains($adminUsers->body, 'certificate.php?user=' . $guardianId),
        'administrator user list links to an earned guardian certificate'
    );
    $adminCertificate = $admin->request('GET', '/certificate.php?user=' . $guardianId);
    record_result(
        $adminCertificate->status === 200
        && str_contains($adminCertificate->body, 'E2E Release Guardian')
        && str_contains($adminCertificate->body, 'First Report'),
        'administrator can generate an eligible guardian certificate',
        'HTTP ' . $adminCertificate->status
    );
    $adminSubmitDenied = $admin->request('GET', '/submit-report.php', null, false);
    record_result($adminSubmitDenied->status === 403, 'administrator cannot submit guardian reports', 'HTTP ' . $adminSubmitDenied->status);

    $staffEmail = 'e2e.staff.' . bin2hex(random_bytes(3)) . '@example.test';
    $staffCreate = $admin->request('POST', '/admin/users.php', [
        'csrf_token' => csrf_token($adminUsers->body),
        'action' => 'create_staff',
        'full_name' => 'E2E Temporary Expert',
        'email' => $staffEmail,
        'phone' => '+63 917 222 2222',
        'role' => 'expert',
        'password' => 'Temporary123!',
        'password_confirmation' => 'Temporary123!',
    ]);
    $staffLookup = $databasePdo->prepare('SELECT id, role, status, password_hash FROM users WHERE email = :email LIMIT 1');
    $staffLookup->execute(['email' => $staffEmail]);
    $staff = $staffLookup->fetch();
    require_result(
        $staffCreate->status === 200 && (bool) $staff
        && $staff['role'] === 'expert' && $staff['status'] === 'active'
        && password_verify('Temporary123!', (string) $staff['password_hash'])
        && str_contains($staffCreate->body, 'Staff account created'),
        'administrator securely provisions a staff account',
        'HTTP ' . $staffCreate->status
    );
    $staffId = (int) $staff['id'];
    record_result(
        (int) $databasePdo->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'admin.user_created' AND entity_id = '" . $staffId . "'")->fetchColumn() === 1,
        'staff provisioning is recorded in the audit log'
    );
    $staffUpdatePage = $admin->request('GET', '/admin/users.php');
    $staffSuspend = $admin->request('POST', '/admin/users.php', [
        'csrf_token' => csrf_token($staffUpdatePage->body),
        'action' => 'update',
        'user_id' => (string) $staffId,
        'role' => 'expert',
        'status' => 'suspended',
    ]);
    $staffLookup->execute(['email' => $staffEmail]);
    $staff = $staffLookup->fetch();
    record_result(
        $staffSuspend->status === 200 && $staff['status'] === 'suspended'
        && str_contains($staffSuspend->body, 'User role and status updated'),
        'administrator suspends a staff account',
        'HTTP ' . $staffSuspend->status
    );
    $staffDeletePage = $admin->request('GET', '/admin/users.php');
    $staffDelete = $admin->request('POST', '/admin/users.php', [
        'csrf_token' => csrf_token($staffDeletePage->body),
        'action' => 'delete',
        'user_id' => (string) $staffId,
    ]);
    $staffLookup->execute(['email' => $staffEmail]);
    record_result(
        $staffDelete->status === 200 && $staffLookup->fetch() === false
        && str_contains($staffDelete->body, 'Unused user account deleted'),
        'administrator deletes an unused suspended staff account',
        'HTTP ' . $staffDelete->status
    );

    $speciesPage = $admin->request('GET', '/admin/species.php');
    $speciesToken = csrf_token($speciesPage->body);
    $speciesName = 'E2E test species ' . bin2hex(random_bytes(3));
    $speciesCreate = $admin->request('POST', '/admin/species.php', [
        'csrf_token' => $speciesToken,
        'action' => 'save',
        'scientific_name' => $speciesName,
        'common_name' => 'Disposable Mangrove',
        'local_name' => 'Temporary',
        'family' => 'Testaceae',
        'iucn_code' => 'NE',
        'iucn_label' => 'Not Evaluated',
        'population_trend' => 'Unknown',
        'root_type' => 'Test roots',
        'leaf_shape' => 'Test leaves',
        'bark_texture' => 'Test bark',
        'provenance' => 'Disposable release journey',
        'active' => '1',
    ]);
    $speciesLookup = $databasePdo->prepare('SELECT id FROM mangrove_species WHERE scientific_name = :name');
    $speciesLookup->execute(['name' => $speciesName]);
    $temporarySpeciesId = (int) $speciesLookup->fetchColumn();
    require_result(
        $speciesCreate->status === 200 && $temporarySpeciesId > 0 && str_contains($speciesCreate->body, 'Species created'),
        'administrator creates a species through the management form', 'HTTP ' . $speciesCreate->status
    );
    $speciesDeletePage = $admin->request('GET', '/admin/species.php');
    $speciesDelete = $admin->request('POST', '/admin/species.php', [
        'csrf_token' => csrf_token($speciesDeletePage->body),
        'action' => 'delete',
        'id' => (string) $temporarySpeciesId,
    ]);
    $speciesLookup->execute(['name' => $speciesName]);
    record_result(
        $speciesDelete->status === 200 && $speciesLookup->fetchColumn() === false
        && str_contains($speciesDelete->body, 'Species deleted'),
        'administrator deletes the unused disposable species', 'HTTP ' . $speciesDelete->status
    );

    $notificationPage = $guardian->request('GET', '/notifications.php?filter=unread');
    $markAll = $guardian->request('POST', '/notifications.php', [
        'csrf_token' => csrf_token($notificationPage->body),
        'action' => 'mark_all',
        'filter' => 'unread',
    ]);
    $unreadStatement = $databasePdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL');
    $unreadStatement->execute(['user_id' => $guardianId]);
    record_result(
        $markAll->status === 200 && (int) $unreadStatement->fetchColumn() === 0,
        'guardian can mark all notifications read', 'HTTP ' . $markAll->status
    );

    $settingsPage = $otherGuardian->request('GET', '/settings.php');
    $profileUpdate = $otherGuardian->request('POST', '/settings.php', [
        'csrf_token' => csrf_token($settingsPage->body),
        'action' => 'profile',
        'full_name' => 'E2E Updated Guardian',
        'email' => 'guardian@test.com',
        'phone' => '+63 917 333 3333',
        'barangay_id' => '1',
    ]);
    $updatedProfile = $databasePdo->query("SELECT full_name, phone FROM users WHERE email = 'guardian@test.com'")->fetch();
    record_result(
        $profileUpdate->status === 200
        && $updatedProfile['full_name'] === 'E2E Updated Guardian'
        && $updatedProfile['phone'] === '+63 917 333 3333'
        && str_contains($profileUpdate->body, 'profile information has been updated'),
        'guardian edits profile and account information',
        'HTTP ' . $profileUpdate->status
    );
    $passwordPage = $otherGuardian->request('GET', '/settings.php');
    $changedPassword = 'E2EChanged456!';
    $passwordUpdate = $otherGuardian->request('POST', '/settings.php', [
        'csrf_token' => csrf_token($passwordPage->body),
        'action' => 'password',
        'current_password' => 'Mangrooves123!',
        'new_password' => $changedPassword,
        'new_password_confirmation' => $changedPassword,
    ]);
    $changedHash = (string) $databasePdo->query("SELECT password_hash FROM users WHERE email = 'guardian@test.com'")->fetchColumn();
    record_result(
        $passwordUpdate->status === 200 && password_verify($changedPassword, $changedHash)
        && str_contains($passwordUpdate->body, 'password has been changed securely'),
        'guardian changes password with a current-password check',
        'HTTP ' . $passwordUpdate->status
    );
    $logoutPage = $otherGuardian->request('GET', '/settings.php');
    $logout = $otherGuardian->request('POST', '/logout.php', [
        'csrf_token' => csrf_token($logoutPage->body),
    ]);
    $relogin = login($otherGuardian, 'guardian@test.com', $changedPassword);
    record_result(
        $logout->status === 200 && $relogin->status === 200 && str_contains($relogin->body, 'Dashboard'),
        'changed password works on the next secure login',
        'HTTP ' . $relogin->status
    );

    $integrity = [
        (int) $databasePdo->query('SELECT COUNT(*) FROM report_observations ro LEFT JOIN reports r ON r.id = ro.report_id WHERE r.id IS NULL')->fetchColumn(),
        (int) $databasePdo->query('SELECT COUNT(*) FROM reports r LEFT JOIN users u ON u.id = r.user_id WHERE u.id IS NULL')->fetchColumn(),
        (int) $databasePdo->query('SELECT COUNT(*) FROM user_badges ub LEFT JOIN badges b ON b.id = ub.badge_id WHERE b.id IS NULL')->fetchColumn(),
    ];
    record_result($integrity === [0, 0, 0], 'final relational integrity has no tested orphan rows');

    $allText = '';
    foreach ($browsers as $browser) {
        $allText .= implode("\n", $browser->textResponses());
    }
    record_result(
        preg_match('/(?:PHP )?(?:Warning|Fatal error|Parse error|Notice|Deprecated):|Uncaught\s+[A-Za-z\\\\]+/i', $allText) !== 1,
        'HTTP responses contain no PHP warnings, notices, deprecations, or fatals'
    );
} catch (JourneyStopped $exception) {
    echo 'STOP  ' . $exception->getMessage() . PHP_EOL;
} catch (Throwable $exception) {
    $failed++;
    echo 'FATAL ' . $exception::class . ': ' . $exception->getMessage() . PHP_EOL;
} finally {
    if ($databasePdo instanceof PDO) {
        try {
            $lookup = $databasePdo->prepare(
                'SELECT r.photo_path FROM reports r JOIN users u ON u.id = r.user_id WHERE u.email = :email'
            );
            $lookup->execute(['email' => $registeredEmail]);
            $uploadedPaths = array_values(array_unique(array_merge($uploadedPaths, $lookup->fetchAll(PDO::FETCH_COLUMN))));
        } catch (Throwable) {
            // Cleanup continues with paths already captured during the journey.
        }
    }

    if (is_resource($serverProcess)) {
        proc_terminate($serverProcess);
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $status = proc_get_status($serverProcess);
            if (!$status['running']) {
                break;
            }
            usleep(100000);
        }
        proc_close($serverProcess);
    }

    $serverLog = '';
    foreach ([$serverStdout, $serverStderr] as $logPath) {
        if (is_string($logPath) && is_file($logPath)) {
            $serverLog .= (string) file_get_contents($logPath);
        }
    }
    $serverLogClean = preg_match(
        '/PHP (?:Warning|Fatal error|Parse error|Notice|Deprecated):|Uncaught\s+[A-Za-z\\\\]+/i',
        $serverLog
    ) !== 1;
    record_result($serverLogClean, 'PHP server log contains no warnings, notices, deprecations, or fatals');
    if (!$serverLogClean) {
        foreach (preg_split('/\R/', $serverLog) ?: [] as $line) {
            if (preg_match('/PHP (?:Warning|Fatal error|Parse error|Notice|Deprecated):|Uncaught\s+[A-Za-z\\\\]+/i', $line)) {
                echo '      ' . $line . PHP_EOL;
            }
        }
    }

    foreach ($uploadedPaths as $relativePath) {
        $relativePath = str_replace('\\', '/', (string) $relativePath);
        if (!preg_match('#^storage/uploads/reports/\d{4}/\d{2}/[a-f0-9]{40}\.(?:jpg|png|webp)$#', $relativePath)) {
            continue;
        }
        $absolutePath = $root . '/' . $relativePath;
        if (is_file($absolutePath)) {
            unlink($absolutePath);
            $uploadDirectories[] = dirname($absolutePath);
        }
    }
    foreach (array_unique($uploadDirectories) as $directory) {
        if (is_dir($directory) && count(scandir($directory) ?: []) === 2) {
            rmdir($directory);
        }
    }

    $sessionDirectory = $root . '/storage/sessions';
    foreach ($browsers as $browser) {
        foreach ($browser->sessionIds() as $sessionId) {
            $sessionPath = $sessionDirectory . '/sess_' . $sessionId;
            if (is_file($sessionPath)) {
                unlink($sessionPath);
            }
        }
        $browser->cleanup();
    }

    $databasePdo = null;
    if ($serverPdo instanceof PDO && preg_match('/^mangrooves_e2e_[a-z0-9_]+$/', $databaseName)) {
        try {
            $serverPdo->exec("DROP DATABASE IF EXISTS `{$databaseName}`");
            record_result(true, 'disposable database is removed', $databaseName);
        } catch (Throwable $cleanupException) {
            record_result(false, 'disposable database is removed', $cleanupException->getMessage());
        }
    }
    foreach ([$serverStdout, $serverStderr] as $logPath) {
        if (is_string($logPath) && is_file($logPath)) {
            unlink($logPath);
        }
    }
}

echo PHP_EOL . "Result: {$passed} passed, {$failed} failed" . PHP_EOL;
exit($failed === 0 ? 0 : 1);
