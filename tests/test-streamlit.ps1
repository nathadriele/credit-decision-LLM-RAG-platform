# =============================================================================
# STREAMLIT TEST SCRIPT - CREDIT DECISION LLM RAG PLATFORM (PowerShell)
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Streamlit Analytics Platform Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to write colored output
function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Blue
}

function Write-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# Check if Docker is running
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
    Write-Info "Docker is running: $dockerVersion"
} catch {
    Write-Error "Docker is not running or not installed."
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found. Creating from template..."
    if (Test-Path ".env.development") {
        Copy-Item ".env.development" ".env"
        Write-Info "Copied .env.development to .env"
    } else {
        Write-Error "No .env template found."
        Write-Host "Please create .env file with required variables." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Info "Starting Streamlit with minimal dependencies..."
Write-Host ""

# Start services
Write-Info "Executing: docker-compose up -d postgres redis api streamlit"
try {
    $output = docker-compose up -d postgres redis api streamlit 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker compose failed: $output"
    }
    Write-Success "Services are starting up..."
} catch {
    Write-Error "Failed to start services: $_"
    Write-Host "Please check Docker Compose configuration." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Info "Waiting for services to be ready..."

# Function to check if a service is responding
function Test-ServiceHealth($url, $serviceName, $maxAttempts = 15) {
    Write-Info "Checking $serviceName at $url..."
    
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "$serviceName is ready!"
                return $true
            }
        } catch {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Warning "$serviceName is not responding after $($maxAttempts * 2) seconds"
    return $false
}

# Wait for services to be ready
Start-Sleep -Seconds 10

Write-Host ""
Write-Info "Checking service health..."

# Check API health
Test-ServiceHealth "http://localhost:3001/health" "API Service"

# Check Streamlit health
Test-ServiceHealth "http://localhost:8501/_stcore/health" "Streamlit Service"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Access Points:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host " * Streamlit Analytics: http://localhost:8501" -ForegroundColor White
Write-Host " * API Health Check:    http://localhost:3001/health" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host " Demo Credentials:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host " * Admin:    admin@creditdecision.com / admin123" -ForegroundColor White
Write-Host " * Analyst:  analyst@creditdecision.com / analyst123" -ForegroundColor White
Write-Host ""

# Ask if user wants to open browser
$openBrowser = Read-Host "Open Streamlit in browser? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Write-Info "Opening browser..."
    Start-Process "http://localhost:8501"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Useful Commands:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " * View logs:     docker-compose logs -f streamlit" -ForegroundColor White
Write-Host " * Stop services: docker-compose down" -ForegroundColor White
Write-Host " * Restart:       docker-compose restart streamlit" -ForegroundColor White
Write-Host " * Check status:  docker-compose ps" -ForegroundColor White
Write-Host ""

Write-Success "Streamlit test environment is ready!"
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Magenta
Write-Host "1. Login with demo credentials" -ForegroundColor White
Write-Host "2. Explore the Dashboard" -ForegroundColor White
Write-Host "3. Try the RAG Explorer" -ForegroundColor White
Write-Host "4. Test different queries" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue"
