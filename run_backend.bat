@echo off
title Agrovisoon - Backend (FastAPI)
echo ========================================================
echo   Starting Agrovisoon FastAPI Backend
echo   URL: http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo ========================================================
echo.

cd /d "%~dp0backend\api_server"

:: Check if python is available
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in your PATH!
    echo Please install Python and make sure it is added to PATH.
    pause
    exit /b 1
)

python -m uvicorn main:app --reload --port 8000
if %errorlevel% neq 0 (
    echo.
    echo Backend stopped with an error code: %errorlevel%
    pause
)
