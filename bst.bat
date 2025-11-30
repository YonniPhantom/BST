@echo off
title BST Launcher - Windows 7

:: Check for Administrator privileges
NET SESSION >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

:: Set working directory to script location
cd /d "%~dp0"

echo ==========================================
echo      BST Application Launcher
echo ==========================================
echo.

cd backend

if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    echo This may take a few minutes. Please wait.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b %errorlevel%
    )
    echo [SUCCESS] Dependencies installed.
) else (
    echo [INFO] Dependencies found. Skipping installation.
)

echo.
echo [INFO] Starting server...
echo [INFO] The application will open in your default browser.
echo.

start "" "http://localhost:3001/app"
node index.js

pause
