param(
    [ValidateSet('supabase', 'legacy')]
    [string]$Backend = 'supabase',
    [int]$Port = 0,
    [string]$PhpBin = 'C:\xampp\php\php.exe'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PublicRoot = Join-Path $ProjectRoot 'public'

if (-not (Test-Path -LiteralPath $PhpBin)) {
    throw "PHP not found at $PhpBin. Pass -PhpBin if XAMPP is installed elsewhere."
}

if ($Port -eq 0) { $Port = if ($Backend -eq 'supabase') { 8086 } else { 8085 } }
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Use a port from 1024 to 65535.' }

if ($Backend -eq 'supabase') {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'supabase/client-config.json'))) {
        throw 'Configure Supabase first. See docs/SUPABASE_MIGRATION.md.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'vercel/node_modules/esbuild'))) {
        throw 'Install the website tools first: npm.cmd --prefix supabase ci and npm.cmd --prefix vercel ci'
    }
    $PreviousPhp = $env:PHP_BINARY
    $PreviousPort = $env:PORT
    try {
        $env:PHP_BINARY = $PhpBin
        $env:PORT = [string]$Port
        & node (Join-Path $ProjectRoot 'vercel/build.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Website build failed. Fix the error above before starting.' }
        & node (Join-Path $ProjectRoot 'vercel/preview.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'The website could not start. Check whether this port is already in use.' }
    } finally {
        $env:PHP_BINARY = $PreviousPhp
        $env:PORT = $PreviousPort
    }
    exit
}

Write-Host "Starting ManGROOVES at http://localhost:$Port" -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop.'
& $PhpBin -S "127.0.0.1:$Port" -t $PublicRoot

