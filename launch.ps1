<#
.SYNOPSIS
    Agrovisoon Demo Launch Script (PowerShell)
    Starts both backend and frontend servers with clean diagnostics.

.USAGE
    From PowerShell:
        .\launch.ps1
    If blocked by ExecutionPolicy, run:
        powershell -ExecutionPolicy Bypass -File .\launch.ps1
#>

$ErrorActionPreference = "Continue"
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = (Get-Location).Path
}

Set-Location $projectRoot

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Agrovisoon Server Launcher" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Workspace: $projectRoot" -ForegroundColor Gray
Write-Host ""

# ── 1. Start Python backend ───────────────────────────────────────────────────
$backendDir = Join-Path $projectRoot "backend\api_server"
Write-Host "[1/3] Starting FastAPI inference server (port 8000)..." -ForegroundColor Yellow

$backend = Start-Process cmd `
    -ArgumentList "/k cd /d `"$backendDir`" && python -m uvicorn main:app --reload --port 8000" `
    -PassThru

Start-Sleep -Seconds 3

# ── 2. Start Next.js frontend ─────────────────────────────────────────────────
# Using cmd /k with npm.cmd avoids PowerShell npm.ps1 ExecutionPolicy blocks
$frontendDir = Join-Path $projectRoot "frontend-local"
Write-Host "[2/3] Starting Next.js frontend (port 3000)..." -ForegroundColor Yellow

$frontend = Start-Process cmd `
    -ArgumentList "/k cd /d `"$frontendDir`" && npm.cmd run dev" `
    -PassThru

Start-Sleep -Seconds 4

# ── 3. Optional Performance Tuning (non-blocking) ─────────────────────────────
Write-Host "[3/3] Checking processes..." -ForegroundColor Yellow
try {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
        Write-Host "    Admin rights detected: applying high priority & affinity tuning..." -ForegroundColor Green
        $cores = (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
        if ($cores -gt 2) {
            $halfCores = [Math]::Floor($cores / 2)
            $lowerMask = [int]([Math]::Pow(2, $halfCores) - 1)
            $upperMask = $lowerMask -shl $halfCores

            Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
                $_.PriorityClass = "High"
                $_.ProcessorAffinity = [IntPtr]$upperMask
            }
            Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
                $_.PriorityClass = "High"
                $_.ProcessorAffinity = [IntPtr]$lowerMask
            }
        }
    } else {
        Write-Host "    Running in standard user mode (performance tuning skipped, no admin required)." -ForegroundColor Gray
    }
} catch {
    # Non-fatal warning
    Write-Host "    Note: process tuning skipped ($($_.Exception.Message))" -ForegroundColor DarkGray
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Both servers launched successfully!" -ForegroundColor Green
Write-Host "  Backend API  -> http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend Web -> http://localhost:3000" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Opening web app in browser..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
} catch {
    Write-Host "Open http://localhost:3000 manually in your browser." -ForegroundColor Yellow
}
