#!/bin/bash

# =============================================================================
# STREAMLIT STARTUP SCRIPT - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

log_info "Starting Streamlit Credit Decision Analytics Platform..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_warning ".env file not found. Creating from template..."
    if [ -f ".env.development" ]; then
        cp .env.development .env
        log_info "Copied .env.development to .env"
    else
        log_error "No .env template found. Please create .env file with required variables."
        exit 1
    fi
fi

# Check for required environment variables
log_info "Checking environment variables..."

if ! grep -q "OPENAI_API_KEY" .env || grep -q "OPENAI_API_KEY=$" .env; then
    log_warning "OPENAI_API_KEY not set in .env file"
    log_info "The application will run in demo mode without real AI functionality"
fi

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service_name to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port" >/dev/null 2>&1 || \
           curl -f -s "http://localhost:$port/health" >/dev/null 2>&1 || \
           curl -f -s "http://localhost:$port/_stcore/health" >/dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "$service_name is not responding after $((max_attempts * 2)) seconds"
    return 1
}

# Start services based on mode
MODE=${1:-"streamlit-only"}

case $MODE in
    "full")
        log_info "Starting full platform (all services)..."
        docker-compose up -d
        
        # Wait for core services
        check_service "PostgreSQL" 5432 || log_warning "PostgreSQL may not be ready"
        check_service "Redis" 6379 || log_warning "Redis may not be ready"
        check_service "API" 3001 || log_warning "API may not be ready"
        check_service "Streamlit" 8501 || log_warning "Streamlit may not be ready"
        ;;
        
    "streamlit-only")
        log_info "Starting Streamlit with minimal dependencies..."
        
        # Start only required services for Streamlit
        docker-compose up -d postgres redis api streamlit
        
        # Wait for services
        check_service "PostgreSQL" 5432 || log_warning "PostgreSQL may not be ready"
        check_service "Redis" 6379 || log_warning "Redis may not be ready"
        check_service "API" 3001 || log_warning "API may not be ready"
        check_service "Streamlit" 8501 || log_warning "Streamlit may not be ready"
        ;;
        
    "local")
        log_info "Starting Streamlit locally (Python)..."
        
        # Check if Python environment is set up
        if [ ! -d "streamlit_app" ]; then
            log_error "streamlit_app directory not found"
            exit 1
        fi
        
        cd streamlit_app
        
        # Check if virtual environment exists
        if [ ! -d "venv" ]; then
            log_info "Creating Python virtual environment..."
            python3 -m venv venv
        fi
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Install dependencies
        log_info "Installing Python dependencies..."
        pip install -r requirements.txt
        
        # Start Streamlit
        log_info "Starting Streamlit application..."
        streamlit run app.py --server.port=8501 --server.address=0.0.0.0
        ;;
        
    *)
        log_error "Invalid mode: $MODE"
        echo "Usage: $0 [full|streamlit-only|local]"
        echo ""
        echo "Modes:"
        echo "  full          - Start all services (web, api, databases, monitoring, streamlit)"
        echo "  streamlit-only - Start only Streamlit and required dependencies (default)"
        echo "  local         - Run Streamlit locally with Python (requires Python 3.11+)"
        exit 1
        ;;
esac

# Show service status
echo ""
log_success "🎉 Streamlit Analytics Platform is starting up!"
echo ""
echo "📊 Access Points:"
echo "  • Streamlit Analytics: http://localhost:8501"

if [ "$MODE" = "full" ]; then
    echo "  • Web Application:     http://localhost:3000"
    echo "  • API Documentation:   http://localhost:3001/api-docs"
    echo "  • Grafana Monitoring:  http://localhost:3000/grafana"
    echo "  • Prometheus Metrics:  http://localhost:9090"
fi

echo ""
echo "🔐 Demo Credentials:"
echo "  • Admin:    admin@creditdecision.com / admin123"
echo "  • Analyst:  analyst@creditdecision.com / analyst123"
echo ""

# Show logs option
if [ "$MODE" != "local" ]; then
    echo "📋 To view logs:"
    echo "  docker-compose logs -f streamlit"
    echo ""
    echo "🛑 To stop services:"
    echo "  docker-compose down"
    echo ""
fi

# Open browser (optional)
if command -v open >/dev/null 2>&1; then
    # macOS
    read -p "Open Streamlit in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open http://localhost:8501
    fi
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    read -p "Open Streamlit in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open http://localhost:8501
    fi
fi

log_success "Streamlit startup script completed!"
