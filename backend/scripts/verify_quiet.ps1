param(
    [string[]]$PytestArgs = @("-q", "--tb=short", "--disable-warnings")
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$RepoRoot = Split-Path -Parent $BackendDir
$LogDir = Join-Path $RepoRoot ".agent\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogPath = Join-Path $LogDir "backend-pytest-$Stamp.log"
$Python = Join-Path $BackendDir "venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

Push-Location $BackendDir
try {
    & $Python -m pytest @PytestArgs *> $LogPath
    $ExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

$Content = Get-Content -Path $LogPath -ErrorAction SilentlyContinue
$Summary = $Content |
    Select-String -Pattern "(\d+ passed|\d+ failed|\d+ errors?|\d+ warnings?)" |
    Select-Object -Last 1

if ($ExitCode -eq 0) {
    $SummaryText = if ($Summary) { $Summary.Line.Trim() } else { "exit 0" }
    Write-Host "backend pytest: PASS - $SummaryText"
    Write-Host "log: $LogPath"
    exit 0
}

Write-Host "backend pytest: FAIL - exit $ExitCode"
Write-Host "log: $LogPath"
Write-Host "last 80 log lines:"
$Content | Select-Object -Last 80
exit $ExitCode
