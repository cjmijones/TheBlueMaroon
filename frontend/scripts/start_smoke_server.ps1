param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 5173,
    [int]$TimeoutSeconds = 30,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Split-Path -Parent $ScriptDir
$SmokeDir = Join-Path $FrontendDir ".smoke"
$MetaPath = Join-Path $SmokeDir "vite-$Port.json"
$StdoutLog = Join-Path $SmokeDir "vite-$Port.out.log"
$StderrLog = Join-Path $SmokeDir "vite-$Port.err.log"

New-Item -ItemType Directory -Force -Path $SmokeDir | Out-Null

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

function Get-NpmCmd {
    $ProgramFilesNpm = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
    if (Test-Path $ProgramFilesNpm) {
        return $ProgramFilesNpm
    }

    $Command = Get-Command npm.cmd -ErrorAction Stop
    return $Command.Source
}

function New-SanitizedProcessStartInfo {
    param(
        [string]$FileName,
        [string]$CommandLine,
        [string]$WorkingDirectory
    )

    $StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $StartInfo.FileName = $FileName
    $StartInfo.WorkingDirectory = $WorkingDirectory
    $StartInfo.UseShellExecute = $false
    $StartInfo.CreateNoWindow = $true
    $StartInfo.Arguments = "/d /s /c `"$CommandLine`""

    try {
        $TargetEnv = $StartInfo.Environment
        if ($null -ne $TargetEnv) {
            $TargetEnv.Clear()
            $ProcessEnv = [Environment]::GetEnvironmentVariables("Process")
            foreach ($Key in @($ProcessEnv.Keys)) {
                if ($Key -ieq "PATH") {
                    continue
                }
                $Value = [string]$ProcessEnv[$Key]
                if ($null -ne $Value) {
                    $TargetEnv[$Key] = $Value
                }
            }

            $PathValue = [Environment]::GetEnvironmentVariable("Path", "Process")
            if (-not $PathValue) {
                $PathValue = [Environment]::GetEnvironmentVariable("PATH", "Process")
            }
            if ($PathValue) {
                $TargetEnv["Path"] = $PathValue
            }
        }
    }
    catch {
        Write-Host "smoke server: INFO - environment sanitizer unavailable; using inherited environment"
    }

    return $StartInfo
}

function Stop-ExistingSmokeServer {
    if (-not (Test-Path $MetaPath)) {
        return
    }

    $Meta = Get-Content -Path $MetaPath -Raw | ConvertFrom-Json
    $ProcessId = [int]$Meta.pid
    $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($Process) {
        & taskkill.exe /PID $ProcessId /T /F | Out-Null
    }
    Remove-Item -Path $MetaPath -Force -ErrorAction SilentlyContinue
}

if ($Force) {
    Stop-ExistingSmokeServer
}

if (Test-PortOpen -HostValue $HostName -PortValue $Port) {
    Write-Host "smoke server: PASS - already listening at http://${HostName}:$Port"
    exit 0
}

$NpmCmd = Get-NpmCmd
$CommandLine = "`"$NpmCmd`" run dev -- --host $HostName --port $Port --strictPort 1>>`"$StdoutLog`" 2>>`"$StderrLog`""
$StartInfo = New-SanitizedProcessStartInfo -FileName $env:ComSpec -CommandLine $CommandLine -WorkingDirectory $FrontendDir
$Process = [System.Diagnostics.Process]::Start($StartInfo)

$Metadata = [ordered]@{
    pid = $Process.Id
    host = $HostName
    port = $Port
    started_at = (Get-Date).ToString("o")
    stdout_log = $StdoutLog
    stderr_log = $StderrLog
}
$Metadata | ConvertTo-Json | Set-Content -Path $MetaPath

$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $Deadline) {
    if ($Process.HasExited) {
        Write-Host "smoke server: FAIL - Vite exited with code $($Process.ExitCode)"
        if (Test-Path $StderrLog) {
            Get-Content -Path $StderrLog | Select-Object -Last 80
        }
        exit $Process.ExitCode
    }

    if (Test-PortOpen -HostValue $HostName -PortValue $Port) {
        Write-Host "smoke server: PASS - started http://${HostName}:$Port"
        Write-Host "pid: $($Process.Id)"
        Write-Host "logs: $StdoutLog"
        exit 0
    }

    Start-Sleep -Milliseconds 500
}

Write-Host "smoke server: FAIL - timed out waiting for http://${HostName}:$Port"
if (Test-Path $StderrLog) {
    Get-Content -Path $StderrLog | Select-Object -Last 80
}
exit 1
