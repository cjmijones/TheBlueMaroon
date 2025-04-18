# Resolve absolute path to backend/ relative to shell-scripts/
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendPath = Join-Path $ScriptDir "..\backend" | Resolve-Path
Set-Location $BackendPath

Write-Output "Setting up virtual environment in: $BackendPath"

# Load .env file if it exists
$envFile = ".env"
if (Test-Path $envFile) {
    Write-Output "Loading environment variables from .env..."
    Get-Content $envFile | Where-Object { $_ -and ($_ -notmatch '^#') } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Output "Loaded ENV_TYPE = $env:ENV_TYPE"
}
else {
    Write-Output "Warning: No .env file found in backend directory."
}

# Check if venv exists
if (-Not (Test-Path ".\venv")) {
    Write-Output "Creating virtual environment..."
    python -m venv venv
}
else {
    Write-Output "Virtual environment already exists."
}

# Path to the activation script
$activateScript = ".\venv\Scripts\Activate.ps1"

# Activate and install dependencies
if (Test-Path $activateScript) {
    Write-Output "Activating virtual environment..."
    & $activateScript

    if (Test-Path ".\requirements.txt") {
        Write-Output "Installing core dependencies from requirements.txt..."
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    }
    else {
        Write-Output "No requirements.txt found. Skipping core install."
    }

    if ($env:ENV_TYPE -eq "dev" -and (Test-Path ".\requirements-dev.txt")) {
        Write-Output "Installing dev dependencies from requirements-dev.txt..."
        pip install -r requirements-dev.txt
    }
    else {
        Write-Output "Skipping dev dependency install (ENV_TYPE=$env:ENV_TYPE)"
    }

    Write-Output ""
    Write-Output "Environment is ready and activated."
    Write-Output "Use 'deactivate' to exit the virtual environment."
}
else {
    Write-Output "Could not find activation script at $activateScript"
}
