# =============================================================================
# CREDIT DECISION LLM RAG PLATFORM - DEVELOPMENT SETUP SCRIPT
# =============================================================================

param(
    [switch]$SkipDependencies,
    [switch]$SkipDocker,
    [switch]$SkipDatabase,
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

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
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
║                         Development Setup Script                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor $Blue

# Check prerequisites
Write-Step "Checking prerequisites..."

$prerequisites = @(
    @{ Name = "Node.js"; Command = "node"; Version = "--version"; MinVersion = "18.0.0" },
    @{ Name = "npm"; Command = "npm"; Version = "--version"; MinVersion = "9.0.0" },
    @{ Name = "Git"; Command = "git"; Version = "--version"; MinVersion = "2.0.0" }
)

if (-not $SkipDocker) {
    $prerequisites += @{ Name = "Docker"; Command = "docker"; Version = "--version"; MinVersion = "20.0.0" }
    $prerequisites += @{ Name = "Docker Compose"; Command = "docker-compose"; Version = "--version"; MinVersion = "2.0.0" }
}

foreach ($prereq in $prerequisites) {
    if (Test-Command $prereq.Command) {
        $version = & $prereq.Command $prereq.Version 2>$null
        Write-Success "$($prereq.Name) is installed: $version"
    }
    else {
        Write-Error "$($prereq.Name) is not installed or not in PATH"
        Write-Host "Please install $($prereq.Name) and try again." -ForegroundColor $Red
        exit 1
    }
}

# Install Node.js dependencies
if (-not $SkipDependencies) {
    Write-Step "Installing Node.js dependencies..."
    try {
        npm install
        Write-Success "Dependencies installed successfully"
    }
    catch {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

# Setup environment files
Write-Step "Setting up environment files..."
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Success "Created .env.local from .env.example"
    Write-Warning "Please update .env.local with your actual configuration values"
}
else {
    Write-Warning ".env.local already exists, skipping..."
}

# Setup Git hooks
Write-Step "Setting up Git hooks..."
try {
    npx husky install
    Write-Success "Git hooks installed successfully"
}
catch {
    Write-Warning "Failed to install Git hooks, continuing..."
}

# Setup Docker environment
if (-not $SkipDocker) {
    Write-Step "Setting up Docker environment..."
    try {
        docker-compose --version | Out-Null
        Write-Success "Docker Compose is available"
        
        Write-Step "Building Docker images..."
        docker-compose build
        Write-Success "Docker images built successfully"
    }
    catch {
        Write-Warning "Docker setup failed, continuing without Docker..."
    }
}

# Database setup
if (-not $SkipDatabase -and -not $SkipDocker) {
    Write-Step "Starting database services..."
    try {
        docker-compose up -d postgres redis chromadb
        Start-Sleep -Seconds 10
        Write-Success "Database services started"
        
        Write-Step "Running database migrations..."
        npm run db:migrate
        Write-Success "Database migrations completed"
        
        Write-Step "Seeding database..."
        npm run db:seed
        Write-Success "Database seeded successfully"
    }
    catch {
        Write-Warning "Database setup failed, you may need to set it up manually"
    }
}

# Build shared packages
Write-Step "Building shared packages..."
try {
    npm run build --workspace=packages/types
    npm run build --workspace=packages/utils
    npm run build --workspace=packages/config
    npm run build --workspace=packages/ai
    Write-Success "Shared packages built successfully"
}
catch {
    Write-Error "Failed to build shared packages"
    exit 1
}

# Run initial tests
Write-Step "Running initial tests..."
try {
    npm run test -- --passWithNoTests
    Write-Success "Initial tests passed"
}
catch {
    Write-Warning "Some tests failed, but continuing setup..."
}

# Final setup steps
Write-Step "Finalizing setup..."

Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║                              SETUP COMPLETE!                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

🎉 Your development environment is ready!

Next steps:
1. Update .env.local with your actual configuration values
2. Start the development servers:
   npm run dev

3. Open your browser:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - Grafana: http://localhost:3003 (admin/admin)

4. Useful commands:
   npm run build          # Build all packages
   npm run test           # Run tests
   npm run lint           # Lint code
   npm run type-check     # Type checking
   npm run docker:up      # Start all services with Docker
   npm run docker:down    # Stop all Docker services

5. VS Code:
   - Install recommended extensions
   - Use Ctrl+Shift+P -> "Tasks: Run Task" for common tasks
   - Debug configurations are available in the Debug panel

Happy coding! 🚀

"@ -ForegroundColor $Green

if ($Verbose) {
    Write-Host "Setup completed with verbose logging enabled." -ForegroundColor $Blue
}
