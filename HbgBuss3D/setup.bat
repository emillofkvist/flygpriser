@echo off
title HbgBuss 3D - Setup
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════╗
echo  ║   HbgBuss 3D - Forsta gangen    ║
echo  ╚══════════════════════════════════╝
echo.

echo [1/2] Installerar paket (npm install)...
call npm install
if errorlevel 1 (
  echo FEL: npm install misslyckades. Ar Node.js installerat?
  pause
  exit /b 1
)

echo.
echo [2/2] Skapar .env.local med dina API-nycklar...

(
  echo VITE_MAPTILER_KEY=utFUisRBIvlNzrvT0yOu
  echo VITE_TRAFIKLAB_KEY=251965c1452e4c769eb6b9fa7cb1a9ac
  echo VITE_TRAFIKLAB_STATIC_KEY=e797dfcbe5bb4c78afe79403d6110979
) > .env.local

echo.
echo  Setup klar!
echo  Dubbelklicka pa start.bat for att starta appen.
echo.
pause
