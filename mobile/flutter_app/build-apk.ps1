param(
    [ValidateSet('supabase', 'firebase', 'legacy')][string]$Backend = 'supabase',
    [string]$SupabaseConfig = '',
    [string]$FirebaseConfig = '',
    [string]$ApiBaseUrl = '',
    [string]$FlutterSdk = '',
    [string]$AndroidSdk = '',
    [string]$JavaHome = '',
    [switch]$Online,
    [switch]$SkipClean
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDefines = @()
if ($Backend -eq 'supabase') {
    if ($SupabaseConfig -eq '') { $SupabaseConfig = Join-Path $project 'supabase-config.json' }
    if (-not (Test-Path -LiteralPath $SupabaseConfig)) { throw 'Create supabase-config.json first. See docs/SUPABASE_MIGRATION.md.' }
    $SupabaseConfig = (Resolve-Path -LiteralPath $SupabaseConfig).Path
    $supabaseSettings = Get-Content -LiteralPath $SupabaseConfig -Raw | ConvertFrom-Json
    $supabaseUrl = ([string]$supabaseSettings.SUPABASE_URL).TrimEnd('/')
    $publicKey = [string]$supabaseSettings.SUPABASE_PUBLISHABLE_KEY
    if ($supabaseUrl -notmatch '^https://[a-z0-9-]+\.supabase\.co$' -or $supabaseSettings.BACKEND -ne 'supabase' -or -not $publicKey -or $publicKey.StartsWith('sb_secret_')) {
        throw 'Use a real Supabase HTTPS project URL, public publishable/anon key, and BACKEND=supabase.'
    }
    if (-not $publicKey.StartsWith('sb_publishable_')) {
        try {
            $payload = $publicKey.Split('.')[1].Replace('-', '+').Replace('_', '/')
            while ($payload.Length % 4) { $payload += '=' }
            $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
            if ($claims.role -ne 'anon') { throw 'Not an anon key' }
        } catch { throw 'Only a public publishable/anon key may be bundled in the APK.' }
    }
    $ApiBaseUrl = "$supabaseUrl/functions/v1/api"
    $Online = $true
    $buildDefines = @("--dart-define-from-file=$SupabaseConfig", '--dart-define=BACKEND=supabase')
} elseif ($Backend -eq 'firebase') {
    if ($FirebaseConfig -eq '') { $FirebaseConfig = Join-Path $project 'firebase-config.json' }
    if (-not (Test-Path -LiteralPath $FirebaseConfig)) {
        throw 'Firebase configuration is missing. Follow docs/FIREBASE_MIGRATION.md and create firebase-config.json before building.'
    }
    $FirebaseConfig = (Resolve-Path -LiteralPath $FirebaseConfig).Path
    $firebaseSettings = Get-Content -LiteralPath $FirebaseConfig -Raw | ConvertFrom-Json
    $firebaseProjectId = [string]$firebaseSettings.FIREBASE_PROJECT_ID
    if ($firebaseProjectId -notmatch '^[a-z][a-z0-9-]{4,28}[a-z0-9]$' -or $firebaseProjectId.StartsWith('demo-') -or
        -not $firebaseSettings.FIREBASE_API_KEY -or $firebaseSettings.BACKEND -ne 'firebase') {
        throw 'Use a real Firebase project ID, Web API key, and BACKEND=firebase. Demo/test configurations cannot be released.'
    }
    $ApiBaseUrl = "https://$firebaseProjectId.web.app/mobile-api"
    $Online = $true
    $buildDefines = @("--dart-define-from-file=$FirebaseConfig", '--dart-define=BACKEND=firebase')
} else {
    if ($ApiBaseUrl -eq '') { throw 'Legacy builds require an explicit -ApiBaseUrl. Production builds use Supabase by default.' }
    $buildDefines = @('--dart-define=BACKEND=legacy', "--dart-define=API_BASE_URL=$ApiBaseUrl")
}
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
    if ($Backend -eq 'supabase' -and ($configuration.backend -ne 'supabase' -or $configuration.project_id -ne ([Uri]$supabaseUrl).Host.Split('.')[0])) {
        throw 'The Supabase API identity does not match this build configuration.'
    }
    Write-Host 'Online API and barangay list verified.'
    if ($Backend -eq 'firebase' -and ($configuration.backend -ne 'firebase' -or $configuration.project_id -ne $firebaseProjectId)) {
        throw 'The Firebase API identity does not match this build configuration.'
    }
}
$gitDirectory = 'C:\Program Files\Git\cmd'
if (Test-Path -LiteralPath $gitDirectory) {
    $env:PATH = $gitDirectory + ';' + $env:PATH
}
$flutter = Get-Command flutter -ErrorAction SilentlyContinue
if ($FlutterSdk -ne '') {
    $flutterCommand = Join-Path $FlutterSdk 'bin\flutter.bat'
    if (-not (Test-Path -LiteralPath $flutterCommand)) {
        throw "Flutter was not found at $flutterCommand."
    }
} elseif ($null -eq $flutter) {
    $flutterPath = 'C:\src\flutter\bin\flutter.bat'
    if (-not (Test-Path -LiteralPath $flutterPath)) {
        throw 'Flutter was not found on PATH or at C:\src\flutter\bin\flutter.bat.'
    }
    $flutterCommand = $flutterPath
} else {
    $flutterCommand = $flutter.Source
}

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($JavaHome -ne '') {
    $env:JAVA_HOME = $JavaHome
} elseif (-not $env:JAVA_HOME -and (Test-Path -LiteralPath 'C:\Program Files\Android\Android Studio\jbr')) {
    $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
}
if ($AndroidSdk -ne '') {
    $env:ANDROID_HOME = $AndroidSdk
} elseif (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
    throw 'Android SDK was not found. Set ANDROID_HOME or pass -AndroidSdk with its installed folder.'
}

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
    & $flutterCommand build apk --release @buildDefines
    if ($LASTEXITCODE -ne 0) { throw 'Flutter APK build failed.' }

    $dist = Join-Path $project 'dist'
    New-Item -ItemType Directory -Force -Path $dist | Out-Null
    $apkName = if ($Backend -eq 'supabase') { 'ManGROOVES-Supabase.apk' } elseif ($Backend -eq 'firebase') { 'ManGROOVES-Firebase.apk' } elseif ($Online) { 'ManGROOVES-Online.apk' } else { 'ManGROOVES-Flutter.apk' }
    Copy-Item -LiteralPath (Join-Path $project 'build\app\outputs\flutter-apk\app-release.apk') `
        -Destination (Join-Path $dist $apkName) -Force
    $apk = Join-Path $dist $apkName
    $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
    Set-Content -LiteralPath ($apk + '.sha256') `
        -Value ($hash + '  ' + $apkName) -Encoding ascii
    $releaseVersion = [regex]::Match((Get-Content -LiteralPath (Join-Path $project 'pubspec.yaml') -Raw), '(?m)^version:\s*(\S+)').Groups[1].Value
    @{ version = $releaseVersion; backend = $Backend; sha256 = $hash } | ConvertTo-Json | Set-Content -LiteralPath ($apk + '.json') -Encoding ascii
    Write-Host "APK ready: $apk"
    Write-Host "SHA-256: $hash"
} finally {
    Pop-Location
}
