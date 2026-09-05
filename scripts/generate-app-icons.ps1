param(
    [string]$Browser = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $PSScriptRoot 'app-icon-render.html'
$OutputDirectory = Join-Path $ProjectRoot 'public\assets\img\icons'
$ProfileDirectory = Join-Path $ProjectRoot 'tmp\icon-render-profile'

if (-not (Test-Path -LiteralPath $Browser)) {
    $Browser = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path -LiteralPath $Browser)) {
    throw 'Google Chrome or Microsoft Edge is required to rasterize the SVG app icon.'
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$sourceUrl = ([System.Uri]$Source).AbsoluteUri

try {
    foreach ($size in @(180, 192, 512)) {
        $output = Join-Path $OutputDirectory "app-icon-$size.png"
        $sizeProfile = Join-Path $ProfileDirectory ([string]$size)
        New-Item -ItemType Directory -Path $sizeProfile -Force | Out-Null
        if (Test-Path -LiteralPath $output) {
            Remove-Item -LiteralPath $output -Force
        }
        $browserArguments = @(
            '--headless'
            '--disable-gpu'
            '--no-sandbox'
            '--hide-scrollbars'
            '--no-first-run'
            '--force-device-scale-factor=1'
            "--user-data-dir=$sizeProfile"
            "--window-size=$size,$size"
            "--screenshot=$output"
            $sourceUrl
        )
        $process = Start-Process `
            -FilePath $Browser `
            -ArgumentList $browserArguments `
            -PassThru `
            -Wait `
            -WindowStyle Hidden
        $deadline = [DateTime]::UtcNow.AddSeconds(10)
        while (-not (Test-Path -LiteralPath $output) -and [DateTime]::UtcNow -lt $deadline) {
            Start-Sleep -Milliseconds 200
        }
        if (-not (Test-Path -LiteralPath $output)) {
            throw "Unable to render the ${size}x${size} application icon."
        }
        Write-Host "Generated $output" -ForegroundColor Green
    }
} finally {
    if (Test-Path -LiteralPath $ProfileDirectory) {
        for ($attempt = 0; $attempt -lt 10; $attempt++) {
            try {
                Remove-Item -LiteralPath $ProfileDirectory -Recurse -Force
                break
            } catch {
                Start-Sleep -Milliseconds 300
            }
        }
    }
}
