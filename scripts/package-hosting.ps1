# Generate a fresh hosting archive. Never include local accounts or secrets.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$distDirectory = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Force -Path $distDirectory | Out-Null
$suffix = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$archivePath = Join-Path $distDirectory ('ManGROOVES-hosting-' + $suffix + '.zip')

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$entries = [ordered]@{}
$prefix = $projectRoot.TrimEnd('\') + '\'
foreach ($directory in @('app', 'config', 'public')) {
    foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $projectRoot $directory) -Recurse -Force -File)) {
        if (-not $file.FullName.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Package input is outside the project.'
        }
        $relative = $file.FullName.Substring($prefix.Length).Replace('\', '/')
        if ($relative -match '^public/(uploads|generated)/') { continue }
        if ($file.Name -ne '.htaccess' -and
            $file.Extension -notin @('.php', '.css', '.js', '.html', '.webmanifest', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf')) {
            continue
        }
        $entries[$relative] = $file.FullName
    }
}
foreach ($relative in @(
    '.htaccess',
    'database/schema.sql',
    'database/reference.sql',
    'scripts/create-admin.php',
    'scripts/healthcheck.php',
    'scripts/evaluate-badges.php',
    'analytics/generate_charts.py',
    'docs/ONLINE_HOSTING.md',
    'docs/DEPLOYMENT.md',
    'storage/.htaccess',
    'storage/sessions/.gitkeep',
    'storage/uploads/.gitkeep',
    'public/uploads/.gitkeep'
)) {
    $entries[$relative] = Join-Path $projectRoot $relative
}
# The .env inside the ZIP is a template, never this computer's real .env.
$entries['.env'] = Join-Path $projectRoot 'deploy/.env.production.example'
$entries['.env.example'] = $entries['.env']
foreach ($source in $entries.Values) {
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Required package input missing: $source"
    }
}

$stream = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($entry in $entries.GetEnumerator()) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive, $entry.Value, $entry.Key, [IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
    $archive.CreateEntry('public/generated/analytics/.gitkeep') | Out-Null
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

Write-Output "Hosting package: $archivePath"
Write-Output "SHA256: $((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash)"
Write-Output 'Contains source, reference data, empty storage, and a production .env template.'
Write-Output 'No local database, accounts, photos, sessions, demo seed, APKs, or live .env included.'
Write-Output 'Deployment instructions: docs/ONLINE_HOSTING.md inside the ZIP.'
