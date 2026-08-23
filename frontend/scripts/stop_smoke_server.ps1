param(
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Split-Path -Parent $ScriptDir
$SmokeDir = Join-Path $FrontendDir ".smoke"
$MetaPath = Join-Path $SmokeDir "vite-$Port.json"

if (-not (Test-Path $MetaPath)) {
    Write-Host "smoke server: PASS - no recorded server for port $Port"
    exit 0
}

$Meta = Get-Content -Path $MetaPath -Raw | ConvertFrom-Json
$ProcessId = [int]$Meta.pid
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

if ($Process) {
    & taskkill.exe /PID $ProcessId /T /F | Out-Null
    Write-Host "smoke server: PASS - stopped pid $ProcessId"
}
else {
    Write-Host "smoke server: PASS - removed stale pid $ProcessId"
}

Remove-Item -Path $MetaPath -Force -ErrorAction SilentlyContinue
