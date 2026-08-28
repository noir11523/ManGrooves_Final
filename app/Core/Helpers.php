<?php

declare(strict_types=1);

function load_env_file(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if ($key === '' || getenv($key) !== false) {
            continue;
        }

        if (strlen($value) >= 2 && (($value[0] === '"' && $value[-1] === '"') || ($value[0] === "'" && $value[-1] === "'"))) {
            $value = substr($value, 1, -1);
        }

        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }
}

function env_value(string $key, mixed $default = null): mixed
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function config(string $key, mixed $default = null): mixed
{
    $value = $GLOBALS['app_config'] ?? [];
    foreach (explode('.', $key) as $segment) {
        if (!is_array($value) || !array_key_exists($segment, $value)) {
            return $default;
        }
        $value = $value[$segment];
    }
    return $value;
}

function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function detect_base_path(): string
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $directory = rtrim(str_replace('\\', '/', dirname($script)), '/.');
    if (str_ends_with($directory, '/admin')
        || str_ends_with($directory, '/api')
        || str_ends_with($directory, '/mobile-api')) {
        $directory = rtrim(str_replace('\\', '/', dirname($directory)), '/.');
    }
    return $directory === '' ? '' : '/' . ltrim($directory, '/');
}

function url(string $path = ''): string
{
    $path = ltrim($path, '/');
    $configured = (string) config('url', '');
    if ($configured !== '') {
        return $configured . ($path === '' ? '' : '/' . $path);
    }

    // Root-relative URLs work on the current origin without trusting the Host header.
    $base = rtrim(detect_base_path(), '/');
    if ($path === '') {
        return $base === '' ? '/' : $base;
    }
    return $base . '/' . $path;
}

function asset(string $path): string
{
    return url('assets/' . ltrim($path, '/'));
}

function report_photo_url(int $reportId): string
{
    return url('photo.php?id=' . $reportId);
}

function redirect(string $path, int $status = 302): never
{
    header('Location: ' . url($path), true, $status);
    exit;
}

function is_post(): bool
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'POST';
}

function input(string $key, mixed $default = null): mixed
{
    return $_POST[$key] ?? $_GET[$key] ?? $default;
}

/**
 * Convert a request value to text without triggering array-to-string warnings.
 * Arrays and objects are treated as invalid input and return the supplied default.
 */
function scalar_string(mixed $value, string $default = ''): string
{
    return is_scalar($value) ? (string) $value : $default;
}

function flash(string $type, string $message): void
{
    $_SESSION['_flash'][] = ['type' => $type, 'message' => $message];
}

function consume_flashes(): array
{
    $messages = $_SESSION['_flash'] ?? [];
    unset($_SESSION['_flash']);
    return is_array($messages) ? $messages : [];
}

function remember_old_input(array $data): void
{
    unset($data['password'], $data['password_confirmation'], $data['csrf_token']);
    $safe = [];
    foreach ($data as $key => $value) {
        if (is_scalar($value) || $value === null) {
            $safe[$key] = $value;
            continue;
        }
        if ($key !== 'observations' || !is_array($value)) {
            continue;
        }
        $safeObservations = [];
        foreach (array_slice($value, 0, 20, true) as $criterion => $selection) {
            if (!is_string($criterion) || mb_strlen($criterion) > 60) {
                continue;
            }
            if (is_scalar($selection)) {
                $safeObservations[$criterion] = (string) $selection;
            } elseif (is_array($selection)) {
                $safeObservations[$criterion] = array_values(array_map(
                    'strval',
                    array_slice(array_filter($selection, 'is_scalar'), 0, 30)
                ));
            }
        }
        $safe[$key] = $safeObservations;
    }
    $_SESSION['_old'] = $safe;
}

function old(string $key, mixed $default = ''): mixed
{
    return $_SESSION['_old'][$key] ?? $default;
}

function clear_old_input(): void
{
    unset($_SESSION['_old']);
}

function render(string $view, array $data = []): void
{
    $viewPath = APP_ROOT . '/app/Views/' . str_replace('.', '/', $view) . '.php';
    if (!is_file($viewPath)) {
        throw new RuntimeException('View not found: ' . $view);
    }

    extract($data, EXTR_SKIP);
    ob_start();
    require $viewPath;
    $content = (string) ob_get_clean();
    require APP_ROOT . '/app/Views/layout.php';
    clear_old_input();
}

function send_http_status(int $status): void
{
    if ($status === 419) {
        $protocol = (string) ($_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.1');
        if (!preg_match('/^HTTP\/\d(?:\.\d)?$/', $protocol)) {
            $protocol = 'HTTP/1.1';
        }
        header($protocol . ' 419 Page Expired', true, 419);
        return;
    }
    http_response_code($status);
}

function json_response(array $payload, int $status = 200): never
{
    send_http_status($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'cli'), 0, 45);
}

function format_datetime(?string $value, string $format = 'M j, Y g:i A'): string
{
    if (!$value) {
        return '—';
    }
    try {
        return (new DateTimeImmutable($value))->format($format);
    } catch (Throwable) {
        return '—';
    }
}

function health_class(string $health): string
{
    return match (strtolower($health)) {
        'healthy' => 'health-healthy',
        'stressed' => 'health-stressed',
        'at risk', 'high risk' => 'health-risk',
        default => 'health-unknown',
    };
}

function report_status_class(string $status): string
{
    return match (strtolower($status)) {
        'verified' => 'text-bg-success',
        'rejected' => 'text-bg-danger',
        default => 'text-bg-warning',
    };
}

function query_string(array $overrides = []): string
{
    $params = array_merge($_GET, $overrides);
    foreach ($params as $key => $value) {
        if ($value === null || $value === '') {
            unset($params[$key]);
        }
    }
    return http_build_query($params);
}
