@echo off
title Streaming Banner Manager & Analytics Server
color 0A

echo ===========================================================
echo   STREAMING BANNER MANAGER & ANALYTICS SERVER
echo ===========================================================
echo.
echo   Checking system environment...

:: Verify Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   [ERROR] Node.js was not found on your system!
    echo   Please install Node.js from: https://nodejs.org/
    echo   And try launching this script again.
    echo.
    pause
    exit /b
)

echo   [OK] Node.js is installed!
echo.
echo   Starting local backend server on port 3000...
echo   (Press Ctrl+C in this window at any time to shut down the server)
echo.
echo -----------------------------------------------------------

:: Open the browser immediately in a second thread
start "" "http://localhost:3000/public/dashboard.html"

:: Run the Node.js server in this window so logs are visible
node server.js

pause
