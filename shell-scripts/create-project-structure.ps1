param (
    [Parameter(Mandatory = $true)]
    [string]$RootPath  # Example: "C:\Users\You\Documents\my-app"
)

function New-SafeDirectory {
    param ([string]$Path)
    if (-Not (Test-Path $Path)) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
        Write-Output "Created directory: $Path"
    } else {
        Write-Output "Skipped existing directory: $Path"
    }
}

function New-SafeFile {
    param ([string]$Path)
    if (-Not (Test-Path $Path)) {
        New-Item -Path $Path -ItemType File -Force | Out-Null
        Write-Output "Created file: $Path"
    } else {
        Write-Output "Skipped existing file: $Path"
    }
}

# Define backend and frontend paths
$backend = Join-Path $RootPath "backend"
$frontend = Join-Path $RootPath "frontend"

# Backend directories
New-SafeDirectory "$backend\app\api"
New-SafeDirectory "$backend\app\core"
New-SafeDirectory "$backend\app\models"
New-SafeDirectory "$backend\app\db"
New-SafeDirectory "$backend\app\services"
New-SafeDirectory "$backend\app\utils"
New-SafeDirectory "$backend\tests"

# Project-level files
New-SafeFile "$backend\requirements.txt"
New-SafeFile "$backend\Dockerfile"
New-SafeFile "$backend\.env"
New-SafeFile "$RootPath\docker-compose.yml"
New-SafeFile "$RootPath\.env.example"
New-SafeFile "$RootPath\.gitignore"

# Source files (backend only)
New-SafeFile "$backend\app\main.py"
New-SafeFile "$backend\app\core\config.py"
New-SafeFile "$backend\app\core\auth.py"
New-SafeFile "$backend\app\api\routes_auth.py"
New-SafeFile "$backend\app\api\routes_posts.py"
New-SafeFile "$backend\app\db\base.py"
New-SafeFile "$backend\app\db\session.py"

# Scaffold frontend using Vite if it doesn't exist
if (-Not (Test-Path $frontend)) {
    Write-Output "Scaffolding frontend using Vite..."
    Push-Location $RootPath
    npm create vite@latest frontend -- --template react-swc-ts
    Pop-Location
} else {
    Write-Output "Skipped frontend scaffold — folder already exists."
}

Write-Output ""
Write-Output "Project structure initialized at: $RootPath"
