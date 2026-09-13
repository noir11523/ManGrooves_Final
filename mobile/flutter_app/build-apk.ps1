param(
    [string]$ApiBaseUrl = 'http://192.168.100.12/mangrooves_v2/public/mobile-api',
    [switch]$Online,
    [switch]$SkipClean
)

$ErrorActionPreference = 'Stop'
$parsedApiUrl = $null
if (-not [Uri]::TryCreate($ApiBaseUrl, [UriKind]::Absolute, [ref]$parsedApiUrl) -or
    $parsedApiUrl.Scheme -notin @('http', 'https')) {
    throw 'ApiBaseUrl must be a complete http:// or https:// URL.'
}
if ($parsedApiUrl.UserInfo -or $parsedApiUrl.Query -or $parsedApiUrl.Fragment) {
    throw 'ApiBaseUrl cannot contain credentials, query parameters, or a fragment.'
}
if ($Online) {
    if ($parsedApiUrl.Scheme -ne 'https' -or $parsedApiUrl.IsLoopback -or
        $parsedApiUrl.HostNameType -ne [UriHostNameType]::Dns -or
        $parsedApiUrl.Host.EndsWith('.local')) {
        throw 'Online builds require your hosting provider HTTPS domain, not a local IP address.'
    }
    $checkUrl = $ApiBaseUrl.TrimEnd('/') + '/configuration.php'
    $configuration = Invoke-RestMethod -Uri $checkUrl -TimeoutSec 20 -ErrorAction Stop
    if ($configuration.ok -ne $true -or
        $configuration.api_id -ne 'org.mangrooves.mobile-api' -or
        @($configuration.barangays).Count -lt 1 -or
        $null -eq $configuration.barangays) {
        throw 'The online API must return the ManGROOVES identity and at least one barangay before building.'
    }
    Write-Host 'Online API and barangay list verified.'
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
    $apkName = if ($Online) { 'ManGROOVES-Online.apk' } else { 'ManGROOVES-Flutter.apk' }
    Copy-Item -LiteralPath (Join-Path $project 'build\app\outputs\flutter-apk\app-release.apk') `
        -Destination (Join-Path $dist $apkName) -Force
    $apk = Join-Path $dist $apkName
    $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
    Set-Content -LiteralPath ($apk + '.sha256') `
        -Value ($hash + '  ' + $apkName) -Encoding ascii
    Write-Host "APK ready: $apk"
    Write-Host "SHA-256: $hash"
} finally {
    Pop-Location
}
