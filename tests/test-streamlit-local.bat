@echo off
echo.
echo ==========================================
echo  Streamlit Local Test (No Docker)
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed.
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo [INFO] Python is available
python --version

REM Navigate to streamlit directory
if not exist "streamlit_app" (
    echo [ERROR] streamlit_app directory not found.
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

cd streamlit_app

echo [INFO] Installing Python dependencies...
pip install streamlit pandas plotly requests python-dotenv numpy seaborn matplotlib

if errorlevel 1 (
    echo [WARNING] Some packages may have failed to install, but continuing...
)

echo.
echo [INFO] Creating local configuration...

REM Create local .env file
echo API_BASE_URL=http://localhost:3001 > .env
echo OPENAI_API_KEY=demo-key >> .env
echo DATABASE_URL=sqlite:///demo.db >> .env
echo REDIS_URL=redis://localhost:6379 >> .env
echo CHROMADB_URL=http://localhost:8000 >> .env

echo [INFO] Starting Streamlit in DEMO MODE...
echo.
echo ==========================================
echo  DEMO MODE - No Backend Required
echo ==========================================
echo.
echo The application will run with simulated data.
echo All features are functional for demonstration.
echo.
echo Access URL: http://localhost:8501
echo.
echo Demo Credentials:
echo   Admin: admin@creditdecision.com / admin123
echo   Analyst: analyst@creditdecision.com / analyst123
echo.

timeout /t 3 /nobreak >nul

REM Start Streamlit
streamlit run app.py --server.port=8501 --server.address=localhost

echo.
echo [INFO] Streamlit has stopped.
pause
