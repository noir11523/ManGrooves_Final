param(
    [string]$SdkRoot = 'C:\Users\User\AppData\Local\Android\Sdk',
    [string]$JavaHome = 'C:\Program Files\Android\Android Studio\jbr',
    [string]$BuildToolsVersion = '36.1.0',
    [string]$PlatformVersion = 'android-36.1',
    [int]$VersionCode = 1,
    [string]$VersionName = '1.0.0'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$BuildRoot = Join-Path $ProjectRoot 'build'
$DistRoot = Join-Path $ProjectRoot 'dist'
$KeystoreRoot = Join-Path $ProjectRoot 'keystore'
$BuildTools = Join-Path $SdkRoot "build-tools\$BuildToolsVersion"
$AndroidJar = Join-Path $SdkRoot "platforms\$PlatformVersion\android.jar"
$Aapt2 = Join-Path $BuildTools 'aapt2.exe'
$D8 = Join-Path $BuildTools 'd8.bat'
$ZipAlign = Join-Path $BuildTools 'zipalign.exe'
$ApkSigner = Join-Path $BuildTools 'apksigner.bat'
$JavaCompiler = Join-Path $JavaHome 'bin\javac.exe'
$JarTool = Join-Path $JavaHome 'bin\jar.exe'
$KeyTool = Join-Path $JavaHome 'bin\keytool.exe'

foreach ($required in @($AndroidJar, $Aapt2, $D8, $ZipAlign, $ApkSigner, $JavaCompiler, $JarTool, $KeyTool)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required Android build tool not found: $required"
    }
}

if (-not $BuildRoot.StartsWith($ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Refusing to clean a build directory outside the Android wrapper project.'
}
if (Test-Path -LiteralPath $BuildRoot) {
    Remove-Item -LiteralPath $BuildRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $BuildRoot, $DistRoot, $KeystoreRoot -Force | Out-Null

$CompiledResources = Join-Path $BuildRoot 'resources.zip'
$GeneratedSources = Join-Path $BuildRoot 'generated'
$ClassesRoot = Join-Path $BuildRoot 'classes'
$DexRoot = Join-Path $BuildRoot 'dex'
$ClassesJar = Join-Path $BuildRoot 'classes.jar'
$UnsignedApk = Join-Path $BuildRoot 'ManGROOVES-unsigned.apk'
$AlignedApk = Join-Path $BuildRoot 'ManGROOVES-aligned.apk'
$FinalApk = Join-Path $DistRoot 'ManGROOVES-debug.apk'
$Keystore = Join-Path $KeystoreRoot 'mangrooves-debug.jks'
New-Item -ItemType Directory -Path $GeneratedSources, $ClassesRoot, $DexRoot -Force | Out-Null

function Invoke-Checked {
    param([string]$Program, [string[]]$CommandArguments)
    & $Program @CommandArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $Program"
    }
}

$previousJavaHome = $env:JAVA_HOME
$previousPath = $env:Path
try {
    $env:JAVA_HOME = $JavaHome
    $env:Path = (Join-Path $JavaHome 'bin') + ';' + $env:Path

    Write-Host 'Compiling Android resources...' -ForegroundColor Cyan
    Invoke-Checked $Aapt2 @('compile', '--dir', (Join-Path $ProjectRoot 'res'), '-o', $CompiledResources)

    Write-Host 'Linking the APK resource package...' -ForegroundColor Cyan
    Invoke-Checked $Aapt2 @(
        'link',
        '-o', $UnsignedApk,
        '-I', $AndroidJar,
        '--manifest', (Join-Path $ProjectRoot 'AndroidManifest.xml'),
        '--java', $GeneratedSources,
        '--min-sdk-version', '29',
        '--target-sdk-version', '36',
        '--version-code', [string]$VersionCode,
        '--version-name', $VersionName,
        $CompiledResources
    )

    Write-Host 'Compiling Java sources...' -ForegroundColor Cyan
    $javaSources = @(
        Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'src') -Recurse -Filter '*.java'
        Get-ChildItem -LiteralPath $GeneratedSources -Recurse -Filter '*.java'
    ) | ForEach-Object { $_.FullName }
    Invoke-Checked $JavaCompiler (@(
        '-encoding', 'UTF-8',
        '-source', '8',
        '-target', '8',
        '-classpath', $AndroidJar,
        '-d', $ClassesRoot
    ) + $javaSources)

    Invoke-Checked $JarTool @('cf', $ClassesJar, '-C', $ClassesRoot, '.')

    Write-Host 'Creating Android bytecode...' -ForegroundColor Cyan
    Invoke-Checked $D8 @(
        '--min-api', '29',
        '--lib', $AndroidJar,
        '--output', $DexRoot,
        $ClassesJar
    )

    Push-Location $DexRoot
    try {
        Invoke-Checked $JarTool @('uf', $UnsignedApk, 'classes.dex')
    } finally {
        Pop-Location
    }

    Write-Host 'Aligning and signing the APK...' -ForegroundColor Cyan
    Invoke-Checked $ZipAlign @('-f', '-p', '4', $UnsignedApk, $AlignedApk)

    if (-not (Test-Path -LiteralPath $Keystore)) {
        Invoke-Checked $KeyTool @(
            '-genkeypair',
            '-keystore', $Keystore,
            '-storepass', 'android',
            '-keypass', 'android',
            '-alias', 'mangrooves',
            '-dname', 'CN=ManGROOVES Development,O=ManGROOVES,C=PH',
            '-keyalg', 'RSA',
            '-keysize', '2048',
            '-validity', '10000',
            '-noprompt'
        )
    }
    if (Test-Path -LiteralPath $FinalApk) {
        Remove-Item -LiteralPath $FinalApk -Force
    }
    Invoke-Checked $ApkSigner @(
        'sign',
        '--ks', $Keystore,
        '--ks-key-alias', 'mangrooves',
        '--ks-pass', 'pass:android',
        '--key-pass', 'pass:android',
        '--out', $FinalApk,
        $AlignedApk
    )
    Invoke-Checked $ApkSigner @('verify', '--verbose', '--print-certs', $FinalApk)
    Invoke-Checked $Aapt2 @('dump', 'badging', $FinalApk)

    $apk = Get-Item -LiteralPath $FinalApk
    $hash = Get-FileHash -LiteralPath $FinalApk -Algorithm SHA256
    Write-Host ''
    Write-Host 'Android APK built successfully.' -ForegroundColor Green
    Write-Host "APK: $($apk.FullName)"
    Write-Host ("Size: {0:N2} MB" -f ($apk.Length / 1MB))
    Write-Host "SHA-256: $($hash.Hash)"
} finally {
    $env:JAVA_HOME = $previousJavaHome
    $env:Path = $previousPath
}

