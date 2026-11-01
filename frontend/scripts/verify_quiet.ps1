param(
    [ValidateSet("all", "build", "lint", "typecheck")]
    [string]$Check = "all"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Split-Path -Parent $ScriptDir
$RepoRoot = Split-Path -Parent $FrontendDir
$LogDir = Join-Path $RepoRoot ".agent\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Invoke-Logged {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$Arguments
    )

    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $LogPath = Join-Path $LogDir "frontend-$Name-$Stamp.log"
    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $Command @Arguments *> $LogPath
    $ExitCode = $LASTEXITCODE
    $ErrorActionPreference = $PreviousErrorActionPreference

    if ($ExitCode -eq 0) {
        $Content = Get-Content -Path $LogPath -ErrorAction SilentlyContinue
        $LintSummary = $Content |
            Select-String -Pattern "\((\d+) errors?, (\d+) warnings?\)" |
            Select-Object -Last 1
        if ($LintSummary) {
            $SummaryText = "$($LintSummary.Matches[0].Groups[1].Value) errors, $($LintSummary.Matches[0].Groups[2].Value) warnings"
        }
        else {
            $Summary = $Content |
                Select-String -Pattern "(built in|0 errors|0 problems|error TS|failed|passed)" |
                Select-Object -Last 1
            $SummaryText = if ($Summary) { $Summary.Line.Trim() } else { "exit 0" }
        }
        Write-Host "frontend ${Name}: PASS - $SummaryText"
        Write-Host "log: $LogPath"
        return
    }

    Write-Host "frontend ${Name}: FAIL - exit $ExitCode"
    Write-Host "log: $LogPath"
    Write-Host "last 80 log lines:"
    Get-Content -Path $LogPath -ErrorAction SilentlyContinue | Select-Object -Last 80
    exit $ExitCode
}

function Get-NpmCommand {
    $ProgramFilesNpm = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
    if (Test-Path $ProgramFilesNpm) {
        return $ProgramFilesNpm
    }

    $Command = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($Command) {
        return $Command.Source
    }

    return "npm"
}

function Invoke-NpmLogged {
    param(
        [string]$Name,
        [string[]]$Arguments
    )

    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $LogPath = Join-Path $LogDir "frontend-$Name-$Stamp.log"
    $NpmCommand = Get-NpmCommand
    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $NpmCommand @Arguments *> $LogPath
    $ExitCode = $LASTEXITCODE
    $ErrorActionPreference = $PreviousErrorActionPreference

    if ($ExitCode -ne 0) {
        $Content = Get-Content -Path $LogPath -ErrorAction SilentlyContinue
        $NpmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"
        $MissingShim = $Content -match "Cannot find module .*npm-cli.js"
        if ($MissingShim -and (Test-Path $NpmCli)) {
            $FallbackLogPath = Join-Path $LogDir "frontend-$Name-$Stamp-fallback.log"
            $PreviousErrorActionPreference = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            & node $NpmCli @Arguments *> $FallbackLogPath
            $ExitCode = $LASTEXITCODE
            $ErrorActionPreference = $PreviousErrorActionPreference
            $LogPath = $FallbackLogPath
        }
    }

    if ($ExitCode -eq 0) {
        $Content = Get-Content -Path $LogPath -ErrorAction SilentlyContinue
        $LintSummary = $Content |
            Select-String -Pattern "\((\d+) errors?, (\d+) warnings?\)" |
            Select-Object -Last 1
        if ($LintSummary) {
            $SummaryText = "$($LintSummary.Matches[0].Groups[1].Value) errors, $($LintSummary.Matches[0].Groups[2].Value) warnings"
        }
        else {
            $Summary = $Content |
                Select-String -Pattern "(built in|0 errors|0 problems|warnings?\))" |
                Select-Object -Last 1
            $SummaryText = if ($Summary) { $Summary.Line.Trim() } else { "exit 0" }
        }
        Write-Host "frontend ${Name}: PASS - $SummaryText"
        Write-Host "log: $LogPath"
        return
    }

    Write-Host "frontend ${Name}: FAIL - exit $ExitCode"
    Write-Host "log: $LogPath"
    Write-Host "last 80 log lines:"
    Get-Content -Path $LogPath -ErrorAction SilentlyContinue | Select-Object -Last 80
    exit $ExitCode
}

Push-Location $FrontendDir
try {
    if ($Check -eq "typecheck") {
        Invoke-Logged -Name "typecheck" -Command ".\node_modules\.bin\tsc.cmd" -Arguments @("-b")
    }
    elseif ($Check -eq "build") {
        Invoke-NpmLogged -Name "build" -Arguments @("run", "build")
    }
    elseif ($Check -eq "lint") {
        Invoke-NpmLogged -Name "lint" -Arguments @("run", "lint")
    }
    else {
        Invoke-NpmLogged -Name "build" -Arguments @("run", "build")
        Invoke-NpmLogged -Name "lint" -Arguments @("run", "lint")
    }
}
finally {
    Pop-Location
}
