@echo off
title MockMate AI Launcher
echo ========================================================
echo  Starting MockMate AI (Full Stack: React + Spring Boot)
echo ========================================================

echo [1/2] Starting Java Spring Boot REST Backend on port 8080...
start "MockMate AI Backend (Spring Boot)" cmd /k ""%~dp0start-backend.bat""

timeout /t 3 /nobreak >nul

echo [2/2] Starting Original React Frontend on port 5173...
start "MockMate AI Frontend (React)" cmd /k ""%~dp0start-frontend.bat""

echo.
echo ========================================================
echo  Both services launched!
echo  - Frontend: http://127.0.0.1:5173
echo  - Java API: http://localhost:8080/api/status
echo ========================================================
pause
