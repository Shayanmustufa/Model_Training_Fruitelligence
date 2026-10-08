@echo off
title Agrovisoon Unified Launcher
echo ========================================================
echo         Agrovisoon - Launch All Services
echo ========================================================
echo.
echo Root Directory: %~dp0
echo.

:: 1. Launch Backend
echo [1/2] Starting FastAPI Backend on port 8000...
start "Agrovisoon - Backend Server" cmd /k "cd /d "%~dp0backend\api_server" && python -m uvicorn main:app --reload --port 8000"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: 2. Launch Frontend
echo [2/2] Starting Next.js Frontend on port 3000...
start "Agrovisoon - Frontend Web" cmd /k "cd /d "%~dp0frontend-local" && npm.cmd run dev"

echo.
echo ========================================================
echo   Services are running in separate windows!
echo   - Backend API:  http://localhost:8000
echo   - API Docs:     http://localhost:8000/docs
echo   - Health Check: http://localhost:8000/health
echo   - Frontend App: http://localhost:3000
echo ========================================================
echo.
echo Press any key to open http://localhost:3000 in your browser, or close this window.
pause >nul
start http://localhost:3000
