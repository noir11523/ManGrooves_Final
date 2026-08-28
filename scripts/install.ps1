param(
    [string]$MysqlBin = 'C:\xampp\mysql\bin\mysql.exe',
    [string]$PhpBin = 'C:\xampp\php\php.exe',
    [string]$HostName = '',
    [int]$Port = 0,
    [string]$UserName = '',
    [AllowEmptyString()][string]$Password = '',
    [string]$DatabaseName = '',
    [switch]$ReferenceOnly
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SchemaPath = Join-Path $ProjectRoot 'database\schema.sql'
$DataPath = Join-Path $ProjectRoot $(if ($ReferenceOnly) { 'database\reference.sql' } else { 'database\seed.sql' })
$EnvPath = Join-Path $ProjectRoot '.env'
$EnvSettings = @{}

if (Test-Path -LiteralPath $EnvPath) {
    foreach ($line in Get-Content -LiteralPath $EnvPath) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
            $EnvSettings[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
        }
    }
}

if (-not $PSBoundParameters.ContainsKey('HostName') -or $HostName -eq '') {
    $HostName = if ($EnvSettings.ContainsKey('DB_HOST')) { $EnvSettings['DB_HOST'] } else { '127.0.0.1' }
}
if (-not $PSBoundParameters.ContainsKey('Port') -or $Port -le 0) {
    $Port = if ($EnvSettings.ContainsKey('DB_PORT')) { [int]$EnvSettings['DB_PORT'] } else { 3306 }
}
if (-not $PSBoundParameters.ContainsKey('UserName') -or $UserName -eq '') {
    $UserName = if ($EnvSettings.ContainsKey('DB_USERNAME')) { $EnvSettings['DB_USERNAME'] } else { 'root' }
}
if (-not $PSBoundParameters.ContainsKey('Password')) {
    $Password = if ($EnvSettings.ContainsKey('DB_PASSWORD')) { $EnvSettings['DB_PASSWORD'] } else { '' }
}
if (-not $PSBoundParameters.ContainsKey('DatabaseName') -or $DatabaseName -eq '') {
    $DatabaseName = if ($EnvSettings.ContainsKey('DB_DATABASE')) { $EnvSettings['DB_DATABASE'] } else { 'mangrooves_db' }
}

if (-not (Test-Path -LiteralPath $MysqlBin)) {
    throw "MySQL client not found at $MysqlBin. Start XAMPP and pass -MysqlBin if it is installed elsewhere."
}
if (-not (Test-Path -LiteralPath $PhpBin)) {
    throw "PHP not found at $PhpBin. Pass -PhpBin if XAMPP is installed elsewhere."
}
if ($DatabaseName -notmatch '^[A-Za-z0-9_]+$') {
    throw 'DatabaseName may contain only letters, numbers, and underscores.'
}

$TrackedEnvironment = @('MYSQL_PWD', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD')
$PreviousEnvironment = @{}
foreach ($key in $TrackedEnvironment) {
    $PreviousEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}

try {
    [Environment]::SetEnvironmentVariable('MYSQL_PWD', $(if ($Password -ne '') { $Password } else { $null }), 'Process')
    $arguments = @("--host=$HostName", "--port=$Port", "--user=$UserName")
    $createArguments = $arguments + "--execute=CREATE DATABASE IF NOT EXISTS ``$DatabaseName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    & $MysqlBin @createArguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not create the application database.'
    }

    $sourceCommand = "SOURCE $($SchemaPath.Replace('\', '/')); SOURCE $($DataPath.Replace('\', '/'));"
    $importArguments = $arguments + "--database=$DatabaseName" + "--execute=$sourceCommand"
    & $MysqlBin @importArguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Database installation failed. Confirm that MySQL is running and the connection values are correct.'
    }

    [Environment]::SetEnvironmentVariable('DB_HOST', $HostName, 'Process')
    [Environment]::SetEnvironmentVariable('DB_PORT', [string]$Port, 'Process')
    [Environment]::SetEnvironmentVariable('DB_DATABASE', $DatabaseName, 'Process')
    [Environment]::SetEnvironmentVariable('DB_USERNAME', $UserName, 'Process')
    [Environment]::SetEnvironmentVariable('DB_PASSWORD', $Password, 'Process')
    $healthArguments = @((Join-Path $PSScriptRoot 'healthcheck.php'))
    if ($ReferenceOnly) {
        $healthArguments += '--allow-no-admin'
    }
    & $PhpBin @healthArguments
    if ($LASTEXITCODE -ne 0) {
        throw 'The database was imported, but the application health check failed.'
    }
} finally {
    foreach ($key in $TrackedEnvironment) {
        [Environment]::SetEnvironmentVariable($key, $PreviousEnvironment[$key], 'Process')
    }
}

Write-Host ''
Write-Host 'ManGROOVES database initialized successfully.' -ForegroundColor Green
if ($ReferenceOnly) {
    Write-Host 'Reference-only mode imported no demo accounts or reports.'
    Write-Host 'Create the first administrator with: .\scripts\create-admin.cmd'
} else {
    Write-Host 'This is a development/demo dataset. Do not rerun this mode after entering real data.' -ForegroundColor Yellow
    Write-Host 'Demo password for all seeded accounts: Mangrooves123!'
}
Write-Host 'Start the app with: .\scripts\start.cmd'
