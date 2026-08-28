param(
    [string]$PhpBin = 'C:\xampp\php\php.exe'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $PhpBin)) {
    throw "PHP not found at $PhpBin. Pass -PhpBin if it is installed elsewhere."
}

$AdminName = Read-Host 'Administrator full name'
$AdminEmail = Read-Host 'Administrator email'
$FirstPassword = Read-Host 'Password (12 to 72 characters)' -AsSecureString
$SecondPassword = Read-Host 'Confirm password' -AsSecureString
$FirstPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($FirstPassword)
$SecondPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecondPassword)
$PreviousPassword = [Environment]::GetEnvironmentVariable('MANGROOVES_BOOTSTRAP_PASSWORD', 'Process')

try {
    $PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($FirstPointer)
    $PlainConfirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($SecondPointer)
    if ($PlainPassword -cne $PlainConfirmation) {
        throw 'The passwords do not match.'
    }
    [Environment]::SetEnvironmentVariable('MANGROOVES_BOOTSTRAP_PASSWORD', $PlainPassword, 'Process')
    & $PhpBin (Join-Path $PSScriptRoot 'create-admin.php') "--name=$AdminName" "--email=$AdminEmail"
    if ($LASTEXITCODE -ne 0) {
        throw 'The administrator account was not created.'
    }
} finally {
    [Environment]::SetEnvironmentVariable('MANGROOVES_BOOTSTRAP_PASSWORD', $PreviousPassword, 'Process')
    if ($null -ne $FirstPointer) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($FirstPointer) }
    if ($null -ne $SecondPointer) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($SecondPointer) }
    $PlainPassword = $null
    $PlainConfirmation = $null
}
