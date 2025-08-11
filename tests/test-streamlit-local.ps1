# =============================================================================
# STREAMLIT LOCAL TEST - CREDIT DECISION LLM RAG PLATFORM (PowerShell)
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Streamlit Local Test (No Docker)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Python not found"
    }
    Write-Host "[INFO] Python is available: $pythonVersion" -ForegroundColor Blue
} catch {
    Write-Host "[ERROR] Python is not installed." -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://python.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if streamlit_app directory exists
if (-not (Test-Path "streamlit_app")) {
    Write-Host "[ERROR] streamlit_app directory not found." -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to streamlit directory
Set-Location "streamlit_app"

Write-Host "[INFO] Installing Python dependencies..." -ForegroundColor Blue

# Install minimal requirements
try {
    pip install streamlit pandas plotly requests python-dotenv numpy streamlit-option-menu 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Some packages may have failed to install, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "[SUCCESS] Dependencies installed successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARNING] Package installation had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Creating local configuration..." -ForegroundColor Blue

# Create local .env file
@"
API_BASE_URL=http://localhost:3001
OPENAI_API_KEY=demo-key
DATABASE_URL=sqlite:///demo.db
REDIS_URL=redis://localhost:6379
CHROMADB_URL=http://localhost:8000
"@ | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "[INFO] Starting Streamlit in DEMO MODE..." -ForegroundColor Blue
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " DEMO MODE - No Backend Required" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The application will run with simulated data." -ForegroundColor White
Write-Host "All features are functional for demonstration." -ForegroundColor White
Write-Host ""
Write-Host "Access URL: http://localhost:8501" -ForegroundColor Yellow
Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor Cyan
Write-Host "  Admin:    admin@creditdecision.com / admin123" -ForegroundColor White
Write-Host "  Analyst:  analyst@creditdecision.com / analyst123" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 3

# Start Streamlit
Write-Host "[INFO] Launching Streamlit..." -ForegroundColor Blue
Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
Write-Host ""

try {
    streamlit run app.py --server.port=8501 --server.address=localhost
} catch {
    Write-Host ""
    Write-Host "[INFO] Streamlit has stopped." -ForegroundColor Blue
}

# Return to original directory
Set-Location ".."

Write-Host ""
Read-Host "Press Enter to continue"
