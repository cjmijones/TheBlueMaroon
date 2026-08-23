param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 5173,
    [switch]$StopAfter
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript = Join-Path $ScriptDir "start_smoke_server.ps1"
$StopScript = Join-Path $ScriptDir "stop_smoke_server.ps1"

function Test-PortOpen {
    param([string]$HostValue, [int]$PortValue)

    $Client = [System.Net.Sockets.TcpClient]::new()
    try {
        $Async = $Client.BeginConnect($HostValue, $PortValue, $null, $null)
        if (-not $Async.AsyncWaitHandle.WaitOne(500)) {
            return $false
        }
        $Client.EndConnect($Async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $Client.Close()
    }
}

if (-not (Test-PortOpen -HostValue $HostName -PortValue $Port)) {
    & $StartScript -HostName $HostName -Port $Port
    if (-not (Test-PortOpen -HostValue $HostName -PortValue $Port)) {
        if ($StopAfter) {
            & $StopScript -Port $Port
        }
        Write-Host "smoke routes: FAIL - server is not listening at http://${HostName}:$Port"
        exit 1
    }
}

$Routes = @(
    "/",
    "/explore",
    "/asset/smoke-test",
    "/portfolio",
    "/holding/smoke-test"
)

$Failures = @()
foreach ($Route in $Routes) {
    $Url = "http://${HostName}:$Port$Route"
    try {
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        $HasRoot = $Response.Content -match 'id="root"'
        if ($Response.StatusCode -eq 200 -and $HasRoot) {
            Write-Host "smoke route ${Route}: PASS - status 200"
        }
        else {
            $Failures += "smoke route ${Route}: expected status 200 and root element, got status $($Response.StatusCode)"
        }
    }
    catch {
        $Failures += "smoke route ${Route}: $($_.Exception.Message)"
    }
}

if ($StopAfter) {
    & $StopScript -Port $Port
}

if ($Failures.Count -gt 0) {
    foreach ($Failure in $Failures) {
        Write-Host $Failure
    }
    exit 1
}

Write-Host "smoke routes: PASS - $($Routes.Count) routes checked"
