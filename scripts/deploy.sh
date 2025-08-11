#!/bin/bash

# =============================================================================
# DEPLOYMENT SCRIPT - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-development}"
NAMESPACE="credit-decision"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-your-registry.com}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    exit 1
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
    command -v npm >/dev/null 2>&1 || error "npm is required but not installed"
    
    # Check if Docker is running
    docker info >/dev/null 2>&1 || error "Docker is not running"
    
    # Check if kubectl can connect to cluster
    kubectl cluster-info >/dev/null 2>&1 || error "Cannot connect to Kubernetes cluster"
    
    success "Prerequisites check passed"
}

load_environment() {
    log "Loading environment configuration for: $ENVIRONMENT"
    
    ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ -f "$ENV_FILE" ]]; then
        set -a  # Automatically export all variables
        source "$ENV_FILE"
        set +a
        success "Environment configuration loaded"
    else
        warning "Environment file $ENV_FILE not found, using defaults"
    fi
}

build_images() {
    log "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build API image
    log "Building API image..."
    docker build \
        --target production \
        --tag "$DOCKER_REGISTRY/credit-decision-api:$IMAGE_TAG" \
        --file apps/api/Dockerfile \
        .
    
    # Build Web image
    log "Building Web image..."
    docker build \
        --target production \
        --tag "$DOCKER_REGISTRY/credit-decision-web:$IMAGE_TAG" \
        --file apps/web/Dockerfile \
        .
    
    success "Docker images built successfully"
}

push_images() {
    log "Pushing Docker images to registry..."
    
    # Login to registry if credentials are provided
    if [[ -n "$DOCKER_USERNAME" && -n "$DOCKER_PASSWORD" ]]; then
        echo "$DOCKER_PASSWORD" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_USERNAME" --password-stdin
    fi
    
    # Push images
    docker push "$DOCKER_REGISTRY/credit-decision-api:$IMAGE_TAG"
    docker push "$DOCKER_REGISTRY/credit-decision-web:$IMAGE_TAG"
    
    success "Docker images pushed successfully"
}

create_namespace() {
    log "Creating Kubernetes namespace..."
    
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        warning "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f "$PROJECT_ROOT/k8s/namespace.yaml"
        success "Namespace created"
    fi
}

deploy_secrets() {
    log "Deploying secrets..."
    
    # Create secrets from environment variables
    kubectl create secret generic credit-decision-secrets \
        --namespace="$NAMESPACE" \
        --from-literal=database-url="$DATABASE_URL" \
        --from-literal=redis-url="$REDIS_URL" \
        --from-literal=jwt-secret="$JWT_SECRET" \
        --from-literal=openai-api-key="$OPENAI_API_KEY" \
        --from-literal=aws-access-key-id="$AWS_ACCESS_KEY_ID" \
        --from-literal=aws-secret-access-key="$AWS_SECRET_ACCESS_KEY" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Secrets deployed"
}

deploy_configmaps() {
    log "Deploying ConfigMaps..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/configmap.yaml"
    
    success "ConfigMaps deployed"
}

deploy_database() {
    log "Deploying database..."
    
    # Deploy PostgreSQL
    kubectl apply -f "$PROJECT_ROOT/k8s/postgres.yaml"
    
    # Wait for PostgreSQL to be ready
    kubectl wait --for=condition=ready pod -l app=postgres --namespace="$NAMESPACE" --timeout=300s
    
    # Run database migrations
    log "Running database migrations..."
    kubectl run migration-job \
        --namespace="$NAMESPACE" \
        --image="$DOCKER_REGISTRY/credit-decision-api:$IMAGE_TAG" \
        --restart=Never \
        --command -- npm run db:migrate
    
    # Wait for migration to complete
    kubectl wait --for=condition=complete job/migration-job --namespace="$NAMESPACE" --timeout=300s
    
    # Clean up migration job
    kubectl delete job migration-job --namespace="$NAMESPACE"
    
    success "Database deployed and migrated"
}

deploy_redis() {
    log "Deploying Redis..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/redis.yaml"
    
    # Wait for Redis to be ready
    kubectl wait --for=condition=ready pod -l app=redis --namespace="$NAMESPACE" --timeout=300s
    
    success "Redis deployed"
}

deploy_chromadb() {
    log "Deploying ChromaDB..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/chromadb.yaml"
    
    # Wait for ChromaDB to be ready
    kubectl wait --for=condition=ready pod -l app=chromadb --namespace="$NAMESPACE" --timeout=300s
    
    success "ChromaDB deployed"
}

deploy_applications() {
    log "Deploying applications..."
    
    # Update image tags in deployment files
    sed -i.bak "s|image: .*credit-decision-api:.*|image: $DOCKER_REGISTRY/credit-decision-api:$IMAGE_TAG|g" "$PROJECT_ROOT/k8s/api.yaml"
    sed -i.bak "s|image: .*credit-decision-web:.*|image: $DOCKER_REGISTRY/credit-decision-web:$IMAGE_TAG|g" "$PROJECT_ROOT/k8s/web.yaml"
    
    # Deploy API
    kubectl apply -f "$PROJECT_ROOT/k8s/api.yaml"
    
    # Deploy Web
    kubectl apply -f "$PROJECT_ROOT/k8s/web.yaml"
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=available deployment/api --namespace="$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=available deployment/web --namespace="$NAMESPACE" --timeout=300s
    
    # Restore original files
    mv "$PROJECT_ROOT/k8s/api.yaml.bak" "$PROJECT_ROOT/k8s/api.yaml"
    mv "$PROJECT_ROOT/k8s/web.yaml.bak" "$PROJECT_ROOT/k8s/web.yaml"
    
    success "Applications deployed"
}

deploy_ingress() {
    log "Deploying ingress..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/ingress.yaml"
    
    success "Ingress deployed"
}

deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Deploy Prometheus
    kubectl apply -f "$PROJECT_ROOT/k8s/prometheus.yaml"
    
    # Deploy Grafana
    kubectl apply -f "$PROJECT_ROOT/k8s/grafana.yaml"
    
    # Wait for monitoring to be ready
    kubectl wait --for=condition=available deployment/prometheus --namespace="$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=available deployment/grafana --namespace="$NAMESPACE" --timeout=300s
    
    success "Monitoring stack deployed"
}

run_health_checks() {
    log "Running health checks..."
    
    # Get service endpoints
    API_URL=$(kubectl get service api-service --namespace="$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    WEB_URL=$(kubectl get service web-service --namespace="$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    
    if [[ -z "$API_URL" ]]; then
        API_URL="localhost"
        kubectl port-forward service/api-service 3001:3001 --namespace="$NAMESPACE" &
        PORT_FORWARD_PID=$!
        sleep 5
    fi
    
    # Check API health
    if curl -f "http://$API_URL:3001/api/health" >/dev/null 2>&1; then
        success "API health check passed"
    else
        error "API health check failed"
    fi
    
    # Check Web health
    if curl -f "http://$WEB_URL:3000/api/health" >/dev/null 2>&1; then
        success "Web health check passed"
    else
        error "Web health check failed"
    fi
    
    # Clean up port forwarding
    if [[ -n "$PORT_FORWARD_PID" ]]; then
        kill $PORT_FORWARD_PID
    fi
    
    success "All health checks passed"
}

show_deployment_info() {
    log "Deployment completed successfully!"
    echo
    echo "==============================================================================="
    echo "DEPLOYMENT INFORMATION"
    echo "==============================================================================="
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Image Tag: $IMAGE_TAG"
    echo
    echo "Services:"
    kubectl get services --namespace="$NAMESPACE"
    echo
    echo "Pods:"
    kubectl get pods --namespace="$NAMESPACE"
    echo
    echo "Ingress:"
    kubectl get ingress --namespace="$NAMESPACE"
    echo "==============================================================================="
}

# =============================================================================
# MAIN DEPLOYMENT FLOW
# =============================================================================

main() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    check_prerequisites
    load_environment
    
    if [[ "$ENVIRONMENT" != "local" ]]; then
        build_images
        push_images
    fi
    
    create_namespace
    deploy_secrets
    deploy_configmaps
    deploy_database
    deploy_redis
    deploy_chromadb
    deploy_applications
    deploy_ingress
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        deploy_monitoring
    fi
    
    run_health_checks
    show_deployment_info
    
    success "Deployment completed successfully! 🚀"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Show usage if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment> [options]"
    echo
    echo "Environments:"
    echo "  development  - Deploy to development environment"
    echo "  staging      - Deploy to staging environment"
    echo "  production   - Deploy to production environment"
    echo "  local        - Deploy locally (skip image build/push)"
    echo
    echo "Options:"
    echo "  --skip-build    Skip Docker image build"
    echo "  --skip-push     Skip Docker image push"
    echo "  --skip-health   Skip health checks"
    echo
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY - Docker registry URL"
    echo "  IMAGE_TAG       - Docker image tag (default: latest)"
    echo "  DATABASE_URL    - Database connection string"
    echo "  REDIS_URL       - Redis connection string"
    echo "  JWT_SECRET      - JWT secret key"
    echo "  OPENAI_API_KEY  - OpenAI API key"
    exit 1
fi

# Run main function
main "$@"
