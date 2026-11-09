@echo off
setlocal
cd /d "%~dp0\.."
if "%1"=="" (
    powershell -ExecutionPolicy Bypass -File "scripts\deploy.ps1" -Action status
) else (
    powershell -ExecutionPolicy Bypass -File "scripts\deploy.ps1" -Action %1
)
endlocal
