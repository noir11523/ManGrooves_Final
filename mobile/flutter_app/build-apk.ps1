param(
    [string]$ApiBaseUrl = 'http://192.168.100.15/mangrooves_v2/public/mobile-api',
    [switch]$SkipClean
)

$ErrorActionPreference = 'Stop'
$parsedApiUrl = $null
if (-not [Uri]::TryCreate($ApiBaseUrl, [UriKind]::Absolute, [ref]$parsedApiUrl) -or
    $parsedApiUrl.Scheme -notin @('http', 'https')) {
    throw 'ApiBaseUrl must be a complete http:// or https:// URL.'
}
$gitDirectory = 'C:\Program Files\Git\cmd'
if (Test-Path -LiteralPath $gitDirectory) {
    $env:PATH = $gitDirectory + ';' + $env:PATH
}
$flutter = Get-Command flutter -ErrorAction SilentlyContinue
if ($null -eq $flutter) {
    $flutterPath = 'C:\src\flutter\bin\flutter.bat'
    if (-not (Test-Path -LiteralPath $flutterPath)) {
        throw 'Flutter was not found on PATH or at C:\src\flutter\bin\flutter.bat.'
    }
    $flutterCommand = $flutterPath
} else {
    $flutterCommand = $flutter.Source
}

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\User\AppData\Local\Android\Sdk'

Push-Location $project
try {
    if (-not $SkipClean) {
        & $flutterCommand clean
        if ($LASTEXITCODE -ne 0) { throw 'flutter clean failed.' }
    }
    & $flutterCommand pub get
    if ($LASTEXITCODE -ne 0) { throw 'flutter pub get failed.' }
    & $flutterCommand analyze
    if ($LASTEXITCODE -ne 0) { throw 'flutter analyze failed.' }
    & $flutterCommand test
    if ($LASTEXITCODE -ne 0) { throw 'flutter test failed.' }
    & $flutterCommand build apk --release "--dart-define=API_BASE_URL=$ApiBaseUrl"
    if ($LASTEXITCODE -ne 0) { throw 'Flutter APK build failed.' }

    $dist = Join-Path $project 'dist'
    New-Item -ItemType Directory -Force -Path $dist | Out-Null
    Copy-Item -LiteralPath (Join-Path $project 'build\app\outputs\flutter-apk\app-release.apk') `
        -Destination (Join-Path $dist 'ManGROOVES-Flutter.apk') -Force
    $apk = Join-Path $dist 'ManGROOVES-Flutter.apk'
    $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
    Set-Content -LiteralPath (Join-Path $dist 'ManGROOVES-Flutter.apk.sha256') `
        -Value ($hash + '  ManGROOVES-Flutter.apk') -Encoding ascii
    Write-Host "APK ready: $dist\ManGROOVES-Flutter.apk"
    Write-Host "SHA-256: $hash"
} finally {
    Pop-Location
}
