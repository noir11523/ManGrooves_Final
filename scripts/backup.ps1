param(
    [string]$MysqlDumpBin = 'C:\xampp\mysql\bin\mysqldump.exe',
    [string]$HostName = '',
    [int]$Port = 0,
    [string]$UserName = '',
    [AllowEmptyString()][string]$Password = '',
    [string]$DatabaseName = ''
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
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
if ($DatabaseName -notmatch '^[A-Za-z0-9_]+$') {
    throw 'DatabaseName may contain only letters, numbers, and underscores.'
}
if (-not (Test-Path -LiteralPath $MysqlDumpBin)) {
    throw "mysqldump not found at $MysqlDumpBin."
}

$BackupRoot = Join-Path $ProjectRoot 'backups'
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$OutputPath = Join-Path $BackupRoot "$DatabaseName-$Timestamp.sql"
$PreviousMysqlPassword = [Environment]::GetEnvironmentVariable('MYSQL_PWD', 'Process')

try {
    [Environment]::SetEnvironmentVariable('MYSQL_PWD', $(if ($Password -ne '') { $Password } else { $null }), 'Process')
    $arguments = @(
        "--host=$HostName", "--port=$Port", "--user=$UserName",
        '--single-transaction', '--routines', '--triggers', $DatabaseName,
        "--result-file=$OutputPath"
    )
    & $MysqlDumpBin @arguments
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $OutputPath) -or (Get-Item -LiteralPath $OutputPath).Length -eq 0) {
        if (Test-Path -LiteralPath $OutputPath) {
            Remove-Item -LiteralPath $OutputPath -Force
        }
        throw 'Database backup failed; any incomplete output was removed.'
    }
} finally {
    [Environment]::SetEnvironmentVariable('MYSQL_PWD', $PreviousMysqlPassword, 'Process')
}

Write-Host "Backup created: $OutputPath" -ForegroundColor Green
