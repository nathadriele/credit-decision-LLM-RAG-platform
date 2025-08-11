@echo off
echo.
echo ==========================================
echo  Starting Streamlit Analytics Platform
echo ==========================================
echo.

echo [INFO] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found. Please install Docker Desktop.
    pause
    exit /b 1
)

echo [INFO] Starting services...
docker-compose up -d postgres redis api streamlit

echo.
echo [SUCCESS] Services starting! Please wait 30-60 seconds...
echo.
echo Access Streamlit at: http://localhost:8501
echo.
echo Demo Credentials:
echo   Admin: admin@creditdecision.com / admin123
echo   Analyst: analyst@creditdecision.com / analyst123
echo.

timeout /t 5 /nobreak >nul
start http://localhost:8501

echo To stop services later, run: docker-compose down
pause
