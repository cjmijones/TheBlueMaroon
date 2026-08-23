param(
    [switch]$Json,
    [switch]$FailOnDrift
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$Python = Join-Path $BackendDir "venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

$ArgsList = @("scripts\db_audit.py")
if ($Json) {
    $ArgsList += "--json"
}
if ($FailOnDrift) {
    $ArgsList += "--fail-on-drift"
}

Push-Location $BackendDir
try {
    & $Python @ArgsList
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
