@echo off
setlocal
cd /d "%~dp0"
echo.
echo Bernie Wave Editor - Windows Builder
echo =====================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the current Node.js LTS, then run this file again.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 goto :fail
call npm run dist
if errorlevel 1 goto :fail
echo.
echo Build complete. Your EXE files are in the dist folder.
pause
exit /b 0
:fail
echo.
echo Build failed. See the error above.
pause
exit /b 1
