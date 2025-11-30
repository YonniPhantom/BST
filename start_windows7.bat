@echo off
title BST Launcher - Windows 7
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
