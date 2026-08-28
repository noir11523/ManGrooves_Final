<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/app/bootstrap.php';

$user = Auth::requireRoles('system_admin');

if (!is_post()) {
    redirect('admin/analytics.php');
}

Csrf::validateOrFail();

$python = trim((string) env_value('PYTHON_BIN', PHP_OS_FAMILY === 'Windows' ? 'C:\\Windows\\py.exe' : 'python3'));
$script = APP_ROOT . '/analytics/generate_charts.py';
$returnPath = 'admin/analytics.php';
$allowedFilters = [];
foreach (['date_from', 'date_to', 'barangay_id', 'species_id'] as $filter) {
    $value = trim(scalar_string($_POST[$filter] ?? null));
    if ($value !== '') {
        $allowedFilters[$filter] = $value;
    }
}
if ($allowedFilters !== []) {
    $returnPath .= '?' . http_build_query($allowedFilters);
}

$pythonIsPath = str_contains($python, '/') || str_contains($python, '\\');
$pythonIsAllowedCommand = preg_match('/^[A-Za-z0-9._-]+$/', $python) === 1;
if ($python === '' || ($pythonIsPath ? !is_file($python) : !$pythonIsAllowedCommand) || !is_file($script) || !function_exists('proc_open')) {
    flash('danger', 'Python analytics is unavailable. Check PYTHON_BIN and the server configuration.');
    Audit::log('analytics.python_failed', 'analytics', null, ['reason' => 'runtime_unavailable'], (int) $user['id']);
    redirect($returnPath);
}

$descriptorSpec = [
    0 => ['pipe', 'r'],
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w'],
];
$process = proc_open([$python, $script], $descriptorSpec, $pipes, APP_ROOT);
if (!is_resource($process)) {
    flash('danger', 'The analytics process could not be started.');
    Audit::log('analytics.python_failed', 'analytics', null, ['reason' => 'process_start_failed'], (int) $user['id']);
    redirect($returnPath);
}

fclose($pipes[0]);
$stdout = stream_get_contents($pipes[1]) ?: '';
$stderr = stream_get_contents($pipes[2]) ?: '';
fclose($pipes[1]);
fclose($pipes[2]);
$exitCode = proc_close($process);

if ($exitCode === 0) {
    flash('success', 'Static analytics charts were regenerated successfully.');
    Audit::log('analytics.python_generated', 'analytics', null, ['output' => trim($stdout)], (int) $user['id']);
} else {
    $message = trim($stderr) ?: trim($stdout) ?: 'Unknown Python process error.';
    flash('danger', 'Chart generation failed. Review the server error log or run the Python command from the technical guide.');
    Audit::log('analytics.python_failed', 'analytics', null, [
        'exit_code' => $exitCode,
        'message' => mb_substr($message, 0, 1000),
    ], (int) $user['id']);
}

redirect($returnPath);
