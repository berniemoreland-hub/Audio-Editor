@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Bernie Wave Editor Installer

echo.
echo  Bernie Wave Editor - Version 2.0 - Build 003
echo  ===============================================
echo  This will prepare and launch the Windows installer.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Installing the current Node.js LTS...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo.
    echo Windows Package Manager ^(winget^) is unavailable.
    echo Please install Node.js LTS from nodejs.org, then run this file again.
    pause
    exit /b 1
  )
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  if errorlevel 1 goto :fail
  if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where npm >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js installed, but this window cannot see npm yet.
  echo Close this window and double-click INSTALL_BERNIE_WAVE_EDITOR.bat again.
  pause
  exit /b 1
)

echo.
echo Preparing Bernie Wave Editor...
call npm install
if errorlevel 1 goto :fail

echo.
echo Creating Windows installer...
call npm run dist
if errorlevel 1 goto :fail

set "INSTALLER=%~dp0dist\Bernie Wave Editor Setup.exe"
if not exist "%INSTALLER%" (
  echo.
  echo Build finished, but the installer was not found where expected.
  echo Check the dist folder for the generated setup file.
  pause
  exit /b 1
)

echo.
echo Launching Bernie Wave Editor Setup...
start "" "%INSTALLER%"
exit /b 0

:fail
echo.
echo Setup preparation failed. The error is shown above.
pause
exit /b 1
