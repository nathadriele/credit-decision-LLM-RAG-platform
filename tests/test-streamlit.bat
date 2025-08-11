@echo off
REM =============================================================================
REM STREAMLIT TEST SCRIPT - CREDIT DECISION LLM RAG PLATFORM (Windows)
REM =============================================================================

echo.
echo ========================================
echo  Streamlit Analytics Platform Test
echo ========================================
echo.

REM Check if Docker is running
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running or not installed.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [INFO] Docker is running...

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from template...
    if exist ".env.development" (
        copy ".env.development" ".env" >nul
        echo [INFO] Copied .env.development to .env
    ) else (
        echo [ERROR] No .env template found.
        echo Please create .env file with required variables.
        pause
        exit /b 1
    )
)

echo [INFO] Starting Streamlit with minimal dependencies...
echo.

REM Start services
docker-compose up -d postgres redis api streamlit

if errorlevel 1 (
    echo [ERROR] Failed to start services.
    echo Please check Docker Compose configuration.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Services are starting up...
echo.
echo Waiting for services to be ready...

REM Wait a bit for services to start
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo  Access Points:
echo ========================================
echo  * Streamlit Analytics: http://localhost:8501
echo  * API Health Check:    http://localhost:3001/health
echo.
echo ========================================
echo  Demo Credentials:
echo ========================================
echo  * Admin:    admin@creditdecision.com / admin123
echo  * Analyst:  analyst@creditdecision.com / analyst123
echo.

REM Ask if user wants to open browser
set /p OPEN_BROWSER="Open Streamlit in browser? (y/n): "
if /i "%OPEN_BROWSER%"=="y" (
    start http://localhost:8501
)

echo.
echo ========================================
echo  Useful Commands:
echo ========================================
echo  * View logs:     docker-compose logs -f streamlit
echo  * Stop services: docker-compose down
echo  * Restart:       docker-compose restart streamlit
echo.

echo [SUCCESS] Streamlit test environment is ready!
echo Press any key to continue...
pause >nul
