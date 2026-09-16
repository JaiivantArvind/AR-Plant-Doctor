@echo off
setlocal enabledelayedexpansion
title AR Plant Doctor Launcher

cd /d "%~dp0"

echo ============================================================
echo        🌿 AR Plant Doctor - One-Click Launcher 🌿
echo ============================================================
echo.

:: 1. Detect and add Node.js to PATH if in standard locations
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    ) else if exist "%USERPROFILE%\nodejs\node.exe" (
        set "PATH=%USERPROFILE%\nodejs;%PATH%"
    ) else if exist "C:\Users\dhanv\nodejs\node.exe" (
        set "PATH=C:\Users\dhanv\nodejs;%PATH%"
    )
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found on your system!
    echo Please download and install Node.js (LTS version) from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Detected Node.js: !NODE_VER!

:: 2. Auto-setup dependencies if missing
if not exist "node_modules\" (
    echo.
    echo [SETUP] First-time setup detected: Installing project dependencies...
    echo Running 'npm install', please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install npm dependencies.
        echo Please check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [SETUP] Dependencies successfully installed!
)

:: 3. Free port 3000 if occupied
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul

:: 4. Launch through run_app.py (if Python is present) or directly via Node
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [LAUNCH] Starting application via launcher script...
    python run_app.py
) else (
    echo [LAUNCH] Starting Express server...
    start "AR Plant Doctor Server" cmd /k "node server.js"
    
    :: Wait for server startup
    timeout /t 2 >nul
    
    echo [LAUNCH] Opening Care Dashboard and AR Camera in browser...
    start "" "http://localhost:3000/dashboard"
    timeout /t 1 >nul
    start "" "http://localhost:3000"
    
    :: Try launching ngrok if available for mobile testing
    where ngrok >nul 2>nul
    if %errorlevel% equ 0 (
        echo [LAUNCH] Launching ngrok HTTPS tunnel for mobile camera testing...
        start "ngrok Tunnel" cmd /k "ngrok http 3000"
    )

    echo.
    echo ============================================================
    echo   📱 AR Camera:    http://localhost:3000
    echo   📊 Dashboard:    http://localhost:3000/dashboard
    echo.
    echo   💡 Tip for Mobile Testing:
    echo      Mobile browsers require HTTPS for camera permissions.
    echo      Run in another terminal: npx localtunnel --port 3000
    echo      or:                      npx ngrok http 3000
    echo ============================================================
    echo.
    echo Keep this window open while using the app.
    echo Press any key to stop the server...
    pause >nul
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul
)
