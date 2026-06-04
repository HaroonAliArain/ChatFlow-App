@echo off
title Redis Server — ChatFlow
echo.
echo  ╔══════════════════════════════════════╗
echo  ║     Redis Server for ChatFlow        ║
echo  ║     Running on localhost:6379        ║
echo  ╚══════════════════════════════════════╝
echo.

set REDIS_PATH=%LOCALAPPDATA%\Redis\redis-server.exe

if not exist "%REDIS_PATH%" (
    echo [ERROR] redis-server.exe not found at %REDIS_PATH%
    echo Please install Redis for Windows first.
    pause
    exit /b 1
)

echo Starting Redis Server...
echo Press Ctrl+C to stop the server.
echo.

"%REDIS_PATH%" --port 6379
