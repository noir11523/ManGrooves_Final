param(
    [int]$Port = 8085,
    [string]$PhpBin = 'C:\xampp\php\php.exe'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PublicRoot = Join-Path $ProjectRoot 'public'

if (-not (Test-Path -LiteralPath $PhpBin)) {
    throw "PHP not found at $PhpBin. Pass -PhpBin if XAMPP is installed elsewhere."
}

Write-Host "Starting ManGROOVES at http://localhost:$Port" -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop.'
& $PhpBin -S "127.0.0.1:$Port" -t $PublicRoot

