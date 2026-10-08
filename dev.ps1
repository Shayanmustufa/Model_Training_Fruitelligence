<#
.SYNOPSIS
    Agrovisoon dev launcher � starts the FastAPI backend and Next.js frontend
    each in its own PowerShell window.

.DESCRIPTION
    Backend  : backend/api_server/main.py  --> http://localhost:8000
    Frontend : frontend/                   --> http://localhost:3000
    A local MobileViT classifier checkpoint is loaded from
    Desktop\model_classifier when it is present.

.USAGE
    From the repo root in PowerShell:
        .\dev.ps1

    If blocked by ExecutionPolicy:
        powershell -ExecutionPolicy Bypass -File .\dev.ps1
#>

$ErrorActionPreference = "Stop"

# -- Resolve project root ------------------------------------------------------
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

# -- Paths ---------------------------------------------------------------------
$backendDir  = Join-Path $root "backend\api_server"
$frontendDir = Join-Path $root "frontend"
$trainingPython = Join-Path $root "training\.venv\Scripts\python.exe"
$classifierCheckpoint = Join-Path $env:USERPROFILE "Desktop\model_classifier\mobilevit_fold4_stage2_best.pth"

# -- Guard: check dirs exist ---------------------------------------------------
if (-not (Test-Path $backendDir)) {
    Write-Error "Backend directory not found: $backendDir"
    exit 1
}
if (-not (Test-Path $frontendDir)) {
    Write-Error "Frontend directory not found: $frontendDir"
    exit 1
}

# -- Guard: warn if .env.local is missing --------------------------------------
$envFile = Join-Path $frontendDir ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Warning ".env.local not found in $frontendDir"
    Write-Warning "Copy frontend\.env.local.example -> frontend\.env.local and fill in values."
    Write-Warning "Continuing anyway -- CLASSIFY_API_URL defaults to http://localhost:8000"
}

# -- Banner --------------------------------------------------------------------
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Agrovisoon * Dev Launcher" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Root      : $root" -ForegroundColor DarkGray
Write-Host "  Backend   : $backendDir" -ForegroundColor DarkGray
Write-Host "  Frontend  : $frontendDir" -ForegroundColor DarkGray
Write-Host ""

# ==============================================================================
# 1. Start FastAPI backend (port 8000) in its own window
# ==============================================================================
$backendPython = if (Test-Path -LiteralPath $trainingPython -PathType Leaf) {
    $trainingPython
} else {
    "python"
}

$backendCmd = "cd /d `"$backendDir`" && "
if (Test-Path -LiteralPath $classifierCheckpoint -PathType Leaf) {
    $backendCmd += "set `"MODEL_PATH=$classifierCheckpoint`" && "
    Write-Host "  Classifier : $classifierCheckpoint" -ForegroundColor DarkGray
}
$backendCmd += "`"$backendPython`" -m uvicorn main:app --reload --port 8000"

Write-Host "[1/2] Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k title Agrovisoon-Backend && $backendCmd"

# Give uvicorn ~3 s to load models before the frontend tries to connect
Start-Sleep -Seconds 3

# ==============================================================================
# 2. Start Next.js frontend (port 3000) in its own window
# ==============================================================================
$frontendCmd = "cd /d `"$frontendDir`" && npm.cmd run dev"

Write-Host "[2/2] Starting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k title Agrovisoon-Frontend && $frontendCmd"

# -- Summary -------------------------------------------------------------------
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Both servers launched in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend API  --> http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs     --> http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Health Check --> http://localhost:8000/health" -ForegroundColor White
Write-Host "  Frontend     --> http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  To stop both servers run:  .\stop-dev.ps1" -ForegroundColor DarkGray
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
