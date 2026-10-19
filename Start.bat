@echo off
setlocal enabledelayedexpansion
title AR Plant Doctor Launcher

:: 1. Working directory relative to launcher location
cd /d "%~dp0"

echo ============================================================
echo       🌿 AR Plant Doctor — Windows Startup Launcher
echo ============================================================
echo.

:: 2. Prerequisite Detection: Node.js and npm
where node >nul 2>nul
if !errorlevel! equ 0 goto node_detected

if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;!PATH!"
    goto node_detected
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "PATH=C:\Program Files (x86)\nodejs;!PATH!"
    goto node_detected
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;!PATH!"
    goto node_detected
)
if exist "%USERPROFILE%\nodejs\node.exe" (
    set "PATH=%USERPROFILE%\nodejs;!PATH!"
    goto node_detected
)

:node_detected
where node >nul 2>nul
if !errorlevel! neq 0 (
    echo [ERROR] Node.js was not detected on your system!
    echo.
    echo AR Plant Doctor requires Node.js LTS version 18.0.0 or higher.
    echo Please download and install it from:
    echo   https://nodejs.org
    echo.
    echo Once installed, reopen this script.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo [OK] Detected Node.js: !NODE_VER!

:: Check Node major version
set "NODE_NUM=!NODE_VER:v=!"
for /f "tokens=1 delims=." %%a in ("!NODE_NUM!") do set "NODE_MAJOR=%%a"
if !NODE_MAJOR! LSS 18 (
    echo [WARNING] Node.js version !NODE_VER! detected. Node.js 18.0.0+ is recommended.
)

:: 3. Database Safety Check
if not exist "backend\data\plants.json" (
    echo [ERROR] Critical data file 'backend\data\plants.json' is missing!
    echo Please verify your repository structure before launching.
    pause
    exit /b 1
)

:: 4. Configuration Check (without exposing secrets)
if exist ".env" (
    echo [CONFIG] Using custom settings from .env
) else if exist ".env.example" (
    echo [CONFIG] Using standard project defaults - .env.example available
)

:: 5. Dependency Validation (install only when missing or broken)
set "NEED_INSTALL=0"
if not exist "node_modules\" set "NEED_INSTALL=1"
if !NEED_INSTALL! equ 0 (
    node -e "require('express'); require('canvas');" >nul 2>nul
    if !errorlevel! neq 0 set "NEED_INSTALL=1"
)

if !NEED_INSTALL! equ 1 (
    echo.
    echo [SETUP] Initializing required dependencies from package.json...
    echo Running 'npm install', please wait...
    echo.
    call npm install
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Failed to install npm dependencies.
        echo Please verify your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo [SETUP] Dependencies successfully installed and verified!
    echo.
) else (
    echo [OK] Project dependencies verified.
)

:: 6. Free port 3000 if occupied
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%p >nul 2>nul
)

:: 7. Launch Express backend server in a persistent dedicated window
echo [LAUNCH] Starting AR Plant Doctor Express server...
start "AR Plant Doctor Server" cmd /k "node backend/server.js"

:: 8. Active readiness polling before launching browser
echo [WAIT] Waiting for server to become ready on http://localhost:3000...
node -e "const h=require('http');let t=0;function c(){h.get('http://localhost:3000/api/plants',r=>{if(r.statusCode===200)process.exit(0);else rtry();}).on('error',rtry);}function rtry(){if(++t>20)process.exit(1);else setTimeout(c,500);}c();" >nul 2>nul

if !errorlevel! equ 0 (
    echo [READY] Server is responding at http://localhost:3000.
    echo [LAUNCH] Opening Care Dashboard in browser...
    start "" "http://localhost:3000"
) else (
    echo [WARNING] Server startup took longer than expected.
    echo Please inspect the 'AR Plant Doctor Server' console window for error details.
    echo Opening browser tab anyway...
    start "" "http://localhost:3000"
)

:: 9. Optional mobile HTTPS tunnel
where ngrok >nul 2>nul
if !errorlevel! equ 0 (
    echo [TUNNEL] Detected ngrok. Launching HTTPS tunnel for mobile camera testing...
    start "ngrok Tunnel" cmd /k "ngrok http 3000"
)

echo.
echo ============================================================
echo   Care Dashboard:  http://localhost:3000
echo   AR Camera View:  http://localhost:3000/scanner
echo.
echo   Mobile Phone Testing:
echo      Mobile browsers require HTTPS for camera permissions.
echo      Run in a separate terminal: npx localtunnel --port 3000
echo      or:                         npx ngrok http 3000
echo ============================================================
echo.
echo Keep this window open while using the application.
echo Press any key to stop the server...
pause >nul

echo [SHUTDOWN] Stopping server process...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%p >nul 2>nul
)
echo [SHUTDOWN] AR Plant Doctor stopped successfully.
