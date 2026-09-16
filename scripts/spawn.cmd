@echo off
setlocal
REM Human front door (Windows). Same explained Q&A as spawn.ps1, then create.mjs.
where powershell >nul 2>&1
if errorlevel 1 (
  echo PowerShell not found. Run: npm run create
  echo Same questions, via Node.
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0spawn.ps1" %*
exit /b %ERRORLEVEL%
