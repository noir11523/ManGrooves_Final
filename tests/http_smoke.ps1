param(
    [string]$BaseUrl = 'http://127.0.0.1:8085'
)

$ErrorActionPreference = 'Stop'
$script:Passed = 0
$script:Failed = 0

function Record-Result {
    param([string]$Name, [bool]$Ok, [string]$Detail)
    if ($Ok) {
        $script:Passed++
        Write-Host "PASS  $Name ($Detail)" -ForegroundColor Green
    } else {
        $script:Failed++
        Write-Host "FAIL  $Name ($Detail)" -ForegroundColor Red
    }
}

function Request-Status {
    param(
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$Path,
        [string]$Method = 'GET',
        [hashtable]$Body = @{}
    )
    try {
        $response = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $Path) -WebSession $Session -Method $Method -Body $Body -UseBasicParsing
        return [int]$response.StatusCode
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}

function New-AuthenticatedSession {
    param([string]$Email)
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $login = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/login.php') -WebSession $session -UseBasicParsing
    $match = [regex]::Match($login.Content, 'name="csrf_token"\s+value="([^"]+)"')
    if (-not $match.Success) {
        throw "CSRF token was not found on the login page for $Email."
    }
    $result = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/login.php') -WebSession $session -Method POST -Body @{
        csrf_token = $match.Groups[1].Value
        email = $Email
        password = 'Mangrooves123!'
    } -UseBasicParsing
    if ([int]$result.StatusCode -ne 200 -or $result.Content -notmatch 'Dashboard') {
        throw "Login did not reach the dashboard for $Email."
    }
    return $session
}

try {
    $anonymous = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    foreach ($path in @('/', '/login.php', '/register.php', '/privacy.php', '/manifest.webmanifest', '/service-worker.js')) {
        $status = Request-Status -Session $anonymous -Path $path
        Record-Result "anonymous $path" ($status -eq 200) "HTTP $status"
    }

    $apiStatus = Request-Status -Session $anonymous -Path '/api/clusters.php'
    Record-Result 'anonymous API is protected' ($apiStatus -eq 401) "HTTP $apiStatus"

    $guardian = New-AuthenticatedSession -Email 'guardian@test.com'
    foreach ($path in @('/dashboard.php', '/submit-report.php', '/reports.php', '/explore.php', '/badges.php', '/notifications.php', '/settings.php', '/cluster.php?id=1', '/api/clusters.php')) {
        $status = Request-Status -Session $guardian -Path $path
        Record-Result "guardian $path" ($status -eq 200) "HTTP $status"
    }
    $guardianAdmin = Request-Status -Session $guardian -Path '/admin/verification.php'
    Record-Result 'guardian cannot open verification' ($guardianAdmin -eq 403) "HTTP $guardianAdmin"
    $ownReport = Request-Status -Session $guardian -Path '/api/report-detail.php?id=1'
    Record-Result 'guardian can fetch own report detail' ($ownReport -eq 200) "HTTP $ownReport"
    $otherReport = Request-Status -Session $guardian -Path '/api/report-detail.php?id=3'
    Record-Result 'guardian report detail prevents IDOR' ($otherReport -eq 404) "HTTP $otherReport"
    $ownPhoto = Request-Status -Session $guardian -Path '/photo.php?id=1'
    Record-Result 'guardian can fetch own protected photo' ($ownPhoto -eq 200) "HTTP $ownPhoto"
    $otherPhoto = Request-Status -Session $guardian -Path '/photo.php?id=3'
    Record-Result 'guardian cannot fetch another guardian photo' ($otherPhoto -eq 404) "HTTP $otherPhoto"
    $sharedTimeline = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/cluster.php?id=2') -WebSession $guardian -UseBasicParsing
    $timelineRedacted = $sharedTimeline.Content -notmatch 'MGR-DEMO-0003|Avoid stepping on pneumatophores' -and $sharedTimeline.Content -match 'Community observation'
    Record-Result 'shared timeline redacts another guardian evidence' $timelineRedacted "HTTP $($sharedTimeline.StatusCode)"
    $malformedGuardian = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/notifications.php?filter%5B%5D=x') -WebSession $guardian -UseBasicParsing
    Record-Result 'guardian malformed filters do not leak warnings' ($malformedGuardian.Content -notmatch 'Warning:|Array to string conversion') "HTTP $($malformedGuardian.StatusCode)"

    $submitPage = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/submit-report.php') -WebSession $guardian -UseBasicParsing
    $guardianTokenMatch = [regex]::Match($submitPage.Content, 'name="csrf_token"\s+value="([^"]+)"')
    if (-not $guardianTokenMatch.Success) { throw 'CSRF token was not found on the report form.' }
    $guardianToken = $guardianTokenMatch.Groups[1].Value
    $healthPreview = Request-Status -Session $guardian -Path '/api/health-preview.php' -Method POST -Body @{
        csrf_token = $guardianToken
        'observations[leaf_color]' = '1'
        'observations[leaf_condition]' = '4'
        'observations[pests]' = '8'
        'observations[roots]' = '11'
        'observations[bark_trunk]' = '15'
    }
    Record-Result 'guardian health preview API' ($healthPreview -eq 200) "HTTP $healthPreview"
    $speciesPreview = Request-Status -Session $guardian -Path '/api/species-match.php' -Method POST -Body @{
        csrf_token = $guardianToken
        root_type = 'Prop roots (stilt roots)'
        leaf_shape = 'Elliptic'
        bark_texture = 'Rough, grayish to brown'
    }
    Record-Result 'guardian species preview API' ($speciesPreview -eq 200) "HTTP $speciesPreview"
    $badPreviewCsrf = Request-Status -Session $guardian -Path '/api/health-preview.php' -Method POST -Body @{ csrf_token = 'invalid' }
    Record-Result 'preview API rejects invalid CSRF' ($badPreviewCsrf -eq 419) "HTTP $badPreviewCsrf"

    $expert = New-AuthenticatedSession -Email 'expert@test.com'
    foreach ($path in @('/dashboard.php', '/admin/verification.php', '/admin/report.php?id=5', '/admin/analytics.php', '/admin/cluster.php', '/admin/cluster.php?id=1')) {
        $status = Request-Status -Session $expert -Path $path
        Record-Result "expert $path" ($status -eq 200) "HTTP $status"
    }
    $expertReport = Request-Status -Session $expert -Path '/api/report-detail.php?id=3'
    Record-Result 'expert can fetch any report detail' ($expertReport -eq 200) "HTTP $expertReport"
    $expertPhoto = Request-Status -Session $expert -Path '/photo.php?id=3'
    Record-Result 'expert can fetch protected evidence photo' ($expertPhoto -eq 200) "HTTP $expertPhoto"
    foreach ($path in @('/admin/users.php', '/admin/species.php', '/admin/badges.php', '/admin/audit.php')) {
        $status = Request-Status -Session $expert -Path $path
        Record-Result "expert denied $path" ($status -eq 403) "HTTP $status"
    }

    $admin = New-AuthenticatedSession -Email 'admin@test.com'
    foreach ($path in @('/dashboard.php', '/admin/verification.php', '/admin/report.php?id=5', '/admin/analytics.php', '/admin/cluster.php', '/admin/cluster.php?id=1', '/admin/users.php', '/admin/species.php', '/admin/badges.php', '/admin/audit.php')) {
        $status = Request-Status -Session $admin -Path $path
        Record-Result "admin $path" ($status -eq 200) "HTTP $status"
    }
    foreach ($path in @('/admin/verification.php?q%5B%5D=x', '/admin/cluster.php?q%5B%5D=x', '/admin/audit.php?q%5B%5D=x', '/admin/species.php?q%5B%5D=x', '/admin/users.php?q%5B%5D=x')) {
        $response = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $path) -WebSession $admin -UseBasicParsing
        Record-Result "malformed filter $path" ($response.Content -notmatch 'Warning:|Array to string conversion') "HTTP $($response.StatusCode)"
    }

    $loginPage = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/login.php') -WebSession $anonymous -UseBasicParsing
    $tokenMatch = [regex]::Match($loginPage.Content, 'name="csrf_token"\s+value="([^"]+)"')
    $badCsrfStatus = Request-Status -Session $anonymous -Path '/login.php' -Method POST -Body @{
        csrf_token = 'invalid'
        email = 'guardian@test.com'
        password = 'Mangrooves123!'
    }
    Record-Result 'invalid login CSRF rejected' ($badCsrfStatus -eq 419) "HTTP $badCsrfStatus"
} catch {
    $script:Failed++
    Write-Host ('FATAL ' + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ''
Write-Host "Result: $script:Passed passed, $script:Failed failed"
if ($script:Failed -gt 0) { exit 1 }
