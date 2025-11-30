@echo off
title BST Installer
echo ==========================================
echo      BST Application Installer
echo ==========================================
echo.

:: Check for Administrator privileges
NET SESSION >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

:: Set variables
set "TARGET_DIR=%ProgramFiles%\BSTApp"
set "SOURCE_DIR=%~dp0"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\BST App.lnk"
set "ICON_PATH=%TARGET_DIR%\frontend\dist\icon.png"

echo [INFO] Installing to: %TARGET_DIR%
echo.

:: Create target directory
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

:: Create exclude list file temporarily if it doesn't exist (for xcopy)
if not exist "exclude_list.txt" (
    echo node_modules > exclude_list.txt
    echo .git >> exclude_list.txt
    echo .vscode >> exclude_list.txt
)

:: Copy files (excluding node_modules to ensure clean install on target)
echo [INFO] Copying files...
xcopy "%SOURCE_DIR%backend" "%TARGET_DIR%\backend" /E /I /Y /EXCLUDE:exclude_list.txt
xcopy "%SOURCE_DIR%frontend\dist" "%TARGET_DIR%\frontend\dist" /E /I /Y
copy "%SOURCE_DIR%bst.bat" "%TARGET_DIR%\" /Y

:: Create Desktop Shortcut using PowerShell
echo [INFO] Creating Desktop shortcut...
set "SCRIPT_PATH=%TARGET_DIR%\bst.bat"
set "PS_CMD=$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='%SCRIPT_PATH%';$s.WorkingDirectory='%TARGET_DIR%';$s.IconLocation='%ICON_PATH%';$s.Save()"
powershell -Command "%PS_CMD%"

:: Cleanup
if exist "exclude_list.txt" del "exclude_list.txt"

echo.
echo [SUCCESS] Installation complete!
echo [INFO] You can now start the application from your Desktop.
echo.
pause
