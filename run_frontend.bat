@echo off
title Agrovisoon - Frontend (Next.js)
echo ========================================================
echo   Starting Agrovisoon Next.js Frontend
echo   URL: http://localhost:3000
echo ========================================================
echo.

cd /d "%~dp0frontend-local"

:: Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not found in your PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Use npm.cmd to avoid PowerShell execution policy blocks
call npm.cmd run dev
if %errorlevel% neq 0 (
    echo.
    echo Frontend stopped with an error code: %errorlevel%
    pause
)
