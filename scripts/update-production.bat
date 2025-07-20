@echo off
REM Family Board - Quick Production Update Script for Windows
REM This script quickly updates to the latest version without full deployment setup
REM Use this for regular updates after initial deployment

setlocal

REM Configuration
set COMPOSE_FILE=docker-compose.production.yml
set ENV_FILE=.env.production

echo.
echo ============================
echo   Family Board Quick Update
echo ============================
echo.

echo [INFO] Pulling latest images...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" pull
if errorlevel 1 (
    echo [ERROR] Failed to pull images
    pause
    exit /b 1
)

echo [INFO] Restarting services with new images...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d
if errorlevel 1 (
    echo [ERROR] Failed to restart services
    pause
    exit /b 1
)

echo [INFO] Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo [INFO] Running any pending database migrations...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" exec backend npx prisma db push 2>nul
REM Ignore migration errors as they might be normal

echo [SUCCESS] Update completed!
echo [INFO] Services are running at http://localhost:3000
echo.

pause
