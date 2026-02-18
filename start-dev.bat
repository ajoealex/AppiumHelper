@echo off
setlocal

cd /d "%~dp0"

echo Running npm install...
call npm install
if errorlevel 1 goto :error

echo Running npm run install:all...
call npm run install:all
if errorlevel 1 goto :error

echo Copying .env.example to .env...
copy /Y ".env.example" ".env" >nul
if errorlevel 1 goto :error

echo Starting development servers...
call npm run dev
if errorlevel 1 goto :error

exit /b 0

:error
echo Failed with exit code %errorlevel%.
exit /b %errorlevel%
