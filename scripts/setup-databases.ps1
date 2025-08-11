# =============================================================================
# CREDIT DECISION LLM RAG PLATFORM - DATABASE SETUP SCRIPT
# =============================================================================

param(
    [switch]$SkipPostgres,
    [switch]$SkipRedis,
    [switch]$SkipChromaDB,
    [switch]$SkipSeed,
    [switch]$Force,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Blue"

function Write-Step {
    param([string]$Message)
    Write-Host "🚀 $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

function Test-DockerService {
    param([string]$ServiceName, [int]$Port, [int]$TimeoutSeconds = 60)
    
    $elapsed = 0
    $interval = 5
    
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                return $true
            }
        }
        catch {
            # Continue waiting
        }
        
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        Write-Host "." -NoNewline
    }
    
    return $false
}

function Wait-ForPostgres {
    Write-Step "Waiting for PostgreSQL to be ready..."
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $env:PGPASSWORD = "postgres"
            $result = & psql -h localhost -p 5432 -U postgres -d postgres -c "SELECT 1;" 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "PostgreSQL is ready"
                return $true
            }
        }
        catch {
            # Continue waiting
        }
        
        $attempt++
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
    }
    
    Write-Error "PostgreSQL failed to become ready"
    return $false
}

function Test-ChromaDB {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/heartbeat" -Method Get -TimeoutSec 5
        return $true
    }
    catch {
        return $false
    }
}

# =============================================================================
# MAIN SETUP PROCESS
# =============================================================================

Write-Host @"
╔══════════════════════════════════════════════════════════════════════════════╗
║                    CREDIT DECISION LLM RAG PLATFORM                         ║
║                         Database Setup Script                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor $Blue

# Check if Docker is running
Write-Step "Checking Docker status..."
try {
    docker version | Out-Null
    Write-Success "Docker is running"
}
catch {
    Write-Error "Docker is not running. Please start Docker and try again."
    exit 1
}

# Create Docker network if it doesn't exist
Write-Step "Creating Docker network..."
try {
    $networkExists = docker network ls --filter name=credit-decision-network --format "{{.Name}}" | Select-String "credit-decision-network"
    if (-not $networkExists) {
        docker network create credit-decision-network
        Write-Success "Created Docker network: credit-decision-network"
    }
    else {
        Write-Success "Docker network already exists: credit-decision-network"
    }
}
catch {
    Write-Warning "Failed to create Docker network, continuing..."
}

# Setup PostgreSQL
if (-not $SkipPostgres) {
    Write-Step "Setting up PostgreSQL..."
    
    try {
        # Check if PostgreSQL container is already running
        $postgresRunning = docker ps --filter name=credit-decision-postgres --format "{{.Names}}" | Select-String "credit-decision-postgres"
        
        if ($postgresRunning -and -not $Force) {
            Write-Success "PostgreSQL container is already running"
        }
        else {
            if ($Force -and $postgresRunning) {
                Write-Step "Stopping existing PostgreSQL container..."
                docker stop credit-decision-postgres
                docker rm credit-decision-postgres
            }
            
            Write-Step "Starting PostgreSQL container..."
            docker run -d `
                --name credit-decision-postgres `
                --network credit-decision-network `
                -p 5432:5432 `
                -e POSTGRES_DB=credit_decision_db `
                -e POSTGRES_USER=postgres `
                -e POSTGRES_PASSWORD=postgres `
                -v "${PWD}/docker/postgres/init.sql:/docker-entrypoint-initdb.d/01-init.sql" `
                -v "${PWD}/docker/postgres/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql" `
                postgres:15-alpine
            
            if (Wait-ForPostgres) {
                Write-Success "PostgreSQL is ready and initialized"
            }
            else {
                Write-Error "PostgreSQL setup failed"
                exit 1
            }
        }
    }
    catch {
        Write-Error "Failed to setup PostgreSQL: $_"
        exit 1
    }
}

# Setup Redis
if (-not $SkipRedis) {
    Write-Step "Setting up Redis..."
    
    try {
        # Check if Redis container is already running
        $redisRunning = docker ps --filter name=credit-decision-redis --format "{{.Names}}" | Select-String "credit-decision-redis"
        
        if ($redisRunning -and -not $Force) {
            Write-Success "Redis container is already running"
        }
        else {
            if ($Force -and $redisRunning) {
                Write-Step "Stopping existing Redis container..."
                docker stop credit-decision-redis
                docker rm credit-decision-redis
            }
            
            Write-Step "Starting Redis container..."
            docker run -d `
                --name credit-decision-redis `
                --network credit-decision-network `
                -p 6379:6379 `
                redis:7-alpine
            
            if (Test-DockerService -ServiceName "Redis" -Port 6379 -TimeoutSeconds 30) {
                Write-Success "Redis is ready"
            }
            else {
                Write-Error "Redis setup failed"
                exit 1
            }
        }
    }
    catch {
        Write-Error "Failed to setup Redis: $_"
        exit 1
    }
}

# Setup ChromaDB
if (-not $SkipChromaDB) {
    Write-Step "Setting up ChromaDB..."
    
    try {
        # Check if ChromaDB container is already running
        $chromaRunning = docker ps --filter name=credit-decision-chromadb --format "{{.Names}}" | Select-String "credit-decision-chromadb"
        
        if ($chromaRunning -and -not $Force) {
            Write-Success "ChromaDB container is already running"
        }
        else {
            if ($Force -and $chromaRunning) {
                Write-Step "Stopping existing ChromaDB container..."
                docker stop credit-decision-chromadb
                docker rm credit-decision-chromadb
            }
            
            Write-Step "Starting ChromaDB container..."
            docker run -d `
                --name credit-decision-chromadb `
                --network credit-decision-network `
                -p 8000:8000 `
                -e CHROMA_SERVER_HOST=0.0.0.0 `
                -e CHROMA_SERVER_HTTP_PORT=8000 `
                -e PERSIST_DIRECTORY=/chroma/chroma `
                -e ANONYMIZED_TELEMETRY=False `
                -v chroma_data:/chroma/chroma `
                chromadb/chroma:latest
            
            # Wait for ChromaDB to be ready
            Write-Step "Waiting for ChromaDB to be ready..."
            $chromaReady = $false
            $maxAttempts = 30
            $attempt = 0
            
            while ($attempt -lt $maxAttempts -and -not $chromaReady) {
                Start-Sleep -Seconds 2
                $chromaReady = Test-ChromaDB
                $attempt++
                Write-Host "." -NoNewline
            }
            
            if ($chromaReady) {
                Write-Success "ChromaDB is ready"
            }
            else {
                Write-Error "ChromaDB setup failed"
                exit 1
            }
        }
    }
    catch {
        Write-Error "Failed to setup ChromaDB: $_"
        exit 1
    }
}

# Initialize ChromaDB with sample data
if (-not $SkipChromaDB -and -not $SkipSeed) {
    Write-Step "Initializing ChromaDB with sample data..."
    
    try {
        # Check if Python is available
        $pythonCmd = $null
        foreach ($cmd in @("python", "python3", "py")) {
            try {
                & $cmd --version 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $pythonCmd = $cmd
                    break
                }
            }
            catch {
                continue
            }
        }
        
        if ($pythonCmd) {
            # Install required Python packages
            Write-Step "Installing Python dependencies..."
            & $pythonCmd -m pip install chromadb requests --quiet
            
            # Run the initialization script
            $env:CHROMADB_HOST = "localhost"
            $env:CHROMADB_PORT = "8000"
            $env:CHROMADB_AUTH_TOKEN = "test-token"
            
            & $pythonCmd scripts/init-vector-db.py
            Write-Success "ChromaDB initialized with sample data"
        }
        else {
            Write-Warning "Python not found, skipping ChromaDB initialization"
        }
    }
    catch {
        Write-Warning "Failed to initialize ChromaDB with sample data: $_"
    }
}

# Verify all services
Write-Step "Verifying all database services..."

$services = @()
if (-not $SkipPostgres) { $services += @{Name="PostgreSQL"; Port=5432} }
if (-not $SkipRedis) { $services += @{Name="Redis"; Port=6379} }
if (-not $SkipChromaDB) { $services += @{Name="ChromaDB"; Port=8000} }

$allHealthy = $true
foreach ($service in $services) {
    if (Test-DockerService -ServiceName $service.Name -Port $service.Port -TimeoutSeconds 10) {
        Write-Success "$($service.Name) is healthy on port $($service.Port)"
    }
    else {
        Write-Error "$($service.Name) is not responding on port $($service.Port)"
        $allHealthy = $false
    }
}

if ($allHealthy) {
    Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║                           DATABASE SETUP COMPLETE!                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

🎉 All database services are running successfully!

Services:
- PostgreSQL: localhost:5432 (Database: credit_decision_db, User: postgres)
- Redis: localhost:6379
- ChromaDB: localhost:8000

Connection URLs:
- PostgreSQL: postgresql://postgres:postgres@localhost:5432/credit_decision_db
- Redis: redis://localhost:6379
- ChromaDB: http://localhost:8000

Next steps:
1. Update your .env.local file with the database URLs
2. Start your application services
3. Test the database connections

Useful commands:
- docker logs credit-decision-postgres  # View PostgreSQL logs
- docker logs credit-decision-redis     # View Redis logs  
- docker logs credit-decision-chromadb  # View ChromaDB logs

To stop all services:
- docker stop credit-decision-postgres credit-decision-redis credit-decision-chromadb

"@ -ForegroundColor $Green
}
else {
    Write-Error "Some database services failed to start properly. Check the logs for more information."
    exit 1
}

if ($Verbose) {
    Write-Host "Database setup completed with verbose logging enabled." -ForegroundColor $Blue
}
