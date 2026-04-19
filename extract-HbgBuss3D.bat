@echo off
title Extrahera HbgBuss3D
setlocal

set "SRC=%~dp0HbgBuss3D"
set "DST=%USERPROFILE%\Claude\HbgBuss3D"

echo.
echo Kopierar HbgBuss3D till:
echo %DST%
echo.

if exist "%DST%" (
  echo Mappen finns redan. Uppdaterar...
  robocopy "%SRC%" "%DST%" /E /XD node_modules dist .git /XF .env.local /NFL /NDL /NJH
) else (
  robocopy "%SRC%" "%DST%" /E /XD node_modules dist .git /XF .env.local /NFL /NDL /NJH
)

echo.
echo Skapar .env.local med API-nycklar...
(
  echo VITE_MAPTILER_KEY=utFUisRBIvlNzrvT0yOu
  echo VITE_TRAFIKLAB_KEY=251965c1452e4c769eb6b9fa7cb1a9ac
  echo VITE_TRAFIKLAB_STATIC_KEY=e797dfcbe5bb4c78afe79403d6110979
) > "%DST%\.env.local"

echo.
echo Initierar eget git-repo...
cd /d "%DST%"
git init -b main
git add -A
git commit -m "feat: HbgBuss3D initial"

echo.
echo ============================================
echo  Klart! HbgBuss3D ligger nu pa:
echo  %DST%
echo.
echo  1. Oppna Claude Code Desktop
echo  2. Lagg till mappen som nytt projekt
echo  3. Dubbelklicka pa start.bat for att kora
echo ============================================
echo.
pause
