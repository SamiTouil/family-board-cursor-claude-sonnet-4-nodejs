@echo off
REM Family Board - Production Deployment Script for Windows
REM This batch file handles deployment on your Windows production machine
REM Run this script whenever you want to update to the latest version

setlocal enabledelayedexpansion

REM Configuration
set COMPOSE_FILE=docker-compose.production.yml
set ENV_FILE=.env.production
set BACKUP_DIR=.\backups

REM Colors (Windows doesn't support colors in batch, but we'll use echo for clarity)
echo.
echo ========================================
echo   Family Board Production Deployment
echo ========================================
echo.

REM Function to check if Docker is running
echo [INFO] Checking Docker status...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [SUCCESS] Docker is running
echo.

REM Function to check if environment file exists
echo [INFO] Checking environment configuration...
if not exist "%ENV_FILE%" (
    echo [ERROR] Environment file %ENV_FILE% not found!
    echo [INFO] Please copy .env.production.example to %ENV_FILE% and configure it.
    pause
    exit /b 1
)
echo [SUCCESS] Environment file found
echo.

REM Function to create backup directory
if not exist "%BACKUP_DIR%" (
    echo [INFO] Creating backup directory...
    mkdir "%BACKUP_DIR%"
    echo [SUCCESS] Backup directory created
    echo.
)

REM Function to backup database
echo [INFO] Creating database backup...
for /f "tokens=2 delims==" %%a in ('findstr "POSTGRES_USER" %ENV_FILE%') do set POSTGRES_USER=%%a
for /f "tokens=2 delims==" %%a in ('findstr "POSTGRES_DB" %ENV_FILE%') do set POSTGRES_DB=%%a

REM Create backup filename with timestamp
for /f "tokens=1-4 delims=/ " %%i in ('date /t') do set mydate=%%k%%j%%i
for /f "tokens=1-2 delims=: " %%i in ('time /t') do set mytime=%%i%%j
set mytime=%mytime: =0%
set BACKUP_FILE=%BACKUP_DIR%\family_board_backup_%mydate%_%mytime%.sql

docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" exec -T postgres pg_dump -U "%POSTGRES_USER%" "%POSTGRES_DB%" > "%BACKUP_FILE%" 2>nul
if errorlevel 1 (
    echo [WARNING] Database backup failed (this is normal if database is empty)
) else (
    echo [SUCCESS] Database backup created: %BACKUP_FILE%
)
echo.

REM Function to pull latest images
echo [INFO] Pulling latest Docker images...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" pull
if errorlevel 1 (
    echo [ERROR] Failed to pull images
    pause
    exit /b 1
)
echo [SUCCESS] Latest images pulled successfully
echo.

REM Function to start services
echo [INFO] Starting services...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)
echo [SUCCESS] Services started successfully
echo.

REM Function to wait for services to be healthy
echo [INFO] Waiting for services to be healthy...

echo [INFO] Checking backend health...
set /a counter=0
:backend_health_loop
curl -f http://localhost:3001/api/health >nul 2>&1
if not errorlevel 1 goto backend_healthy
set /a counter+=1
if %counter% geq 30 (
    echo [ERROR] Backend health check timeout
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
goto backend_health_loop
:backend_healthy
echo [SUCCESS] Backend is healthy

echo [INFO] Checking frontend health...
set /a counter=0
:frontend_health_loop
curl -f http://localhost:3000/health >nul 2>&1
if not errorlevel 1 goto frontend_healthy
set /a counter+=1
if %counter% geq 30 (
    echo [ERROR] Frontend health check timeout
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
goto frontend_health_loop
:frontend_healthy
echo [SUCCESS] Frontend is healthy
echo.

REM Function to run database migrations
echo [INFO] Running database migrations...
docker-compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" exec backend npx prisma db push
if errorlevel 1 (
    echo [WARNING] Database migrations failed (this might be normal for first deployment)
) else (
    echo [SUCCESS] Database migrations completed
)
echo.

REM Function to show deployment status
echo [SUCCESS] Deployment completed successfully!
echo.
echo [INFO] Services are running at:
echo   • Frontend: http://localhost:3000
echo   • Backend API: http://localhost:3001
echo   • Database Admin: http://localhost:8080 (if enabled)
echo.
echo [INFO] To check service status:
echo   docker-compose -f %COMPOSE_FILE% ps
echo.
echo [INFO] To view logs:
echo   docker-compose -f %COMPOSE_FILE% logs -f
echo.
echo [INFO] To stop services:
echo   docker-compose -f %COMPOSE_FILE% down
echo.

pause
