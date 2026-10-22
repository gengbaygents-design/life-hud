@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-background.ps1"
if errorlevel 1 (
  pause
  exit /b 1
)
endlocal
exit /b 0
