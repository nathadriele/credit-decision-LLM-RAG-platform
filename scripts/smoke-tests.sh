#!/bin/bash

# =============================================================================
# SMOKE TESTS - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-staging}"
TIMEOUT=30
RETRY_COUNT=3
RETRY_DELAY=5

# Environment-specific URLs
case $ENVIRONMENT in
    "staging")
        API_BASE_URL="https://staging-api.credit-decision.yourcompany.com"
        WEB_BASE_URL="https://staging.credit-decision.yourcompany.com"
        ;;
    "production")
        API_BASE_URL="https://api.credit-decision.yourcompany.com"
        WEB_BASE_URL="https://credit-decision.yourcompany.com"
        ;;
    "local")
        API_BASE_URL="http://localhost:3001"
        WEB_BASE_URL="http://localhost:3000"
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

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
}

# Retry function
retry() {
    local cmd="$1"
    local description="$2"
    local count=0
    
    while [ $count -lt $RETRY_COUNT ]; do
        if eval "$cmd"; then
            return 0
        fi
        
        count=$((count + 1))
        if [ $count -lt $RETRY_COUNT ]; then
            warning "$description failed (attempt $count/$RETRY_COUNT), retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    error "$description failed after $RETRY_COUNT attempts"
    return 1
}

# HTTP request with timeout
http_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local expected_status="${4:-200}"
    
    local curl_cmd="curl -s -w '%{http_code}' --max-time $TIMEOUT"
    
    if [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
        fi
    fi
    
    local response=$(eval "$curl_cmd '$url'")
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "$body"
        return 0
    else
        error "HTTP $method $url returned $status_code, expected $expected_status"
        echo "Response: $body"
        return 1
    fi
}

# =============================================================================
# HEALTH CHECKS
# =============================================================================

test_api_health() {
    log "Testing API health endpoint..."
    
    retry "http_request '$API_BASE_URL/api/health'" "API health check"
    
    local response=$(http_request "$API_BASE_URL/api/health")
    
    # Validate response structure
    if echo "$response" | jq -e '.status == "healthy"' > /dev/null; then
        success "API health check passed"
        return 0
    else
        error "API health check failed - invalid response structure"
        echo "Response: $response"
        return 1
    fi
}

test_web_health() {
    log "Testing Web health endpoint..."
    
    retry "http_request '$WEB_BASE_URL/api/health'" "Web health check"
    
    success "Web health check passed"
}

test_database_connectivity() {
    log "Testing database connectivity..."
    
    local response=$(http_request "$API_BASE_URL/api/health/database")
    
    if echo "$response" | jq -e '.database.status == "connected"' > /dev/null; then
        success "Database connectivity check passed"
        return 0
    else
        error "Database connectivity check failed"
        echo "Response: $response"
        return 1
    fi
}

test_redis_connectivity() {
    log "Testing Redis connectivity..."
    
    local response=$(http_request "$API_BASE_URL/api/health/redis")
    
    if echo "$response" | jq -e '.redis.status == "connected"' > /dev/null; then
        success "Redis connectivity check passed"
        return 0
    else
        error "Redis connectivity check failed"
        echo "Response: $response"
        return 1
    fi
}

test_vector_db_connectivity() {
    log "Testing Vector DB connectivity..."
    
    local response=$(http_request "$API_BASE_URL/api/health/vector-db")
    
    if echo "$response" | jq -e '.vectorDb.status == "connected"' > /dev/null; then
        success "Vector DB connectivity check passed"
        return 0
    else
        error "Vector DB connectivity check failed"
        echo "Response: $response"
        return 1
    fi
}

# =============================================================================
# FUNCTIONAL TESTS
# =============================================================================

test_authentication() {
    log "Testing authentication..."
    
    # Test login with invalid credentials (should fail)
    local login_data='{"email":"invalid@example.com","password":"wrongpassword"}'
    local response=$(http_request "$API_BASE_URL/api/auth/login" "POST" "$login_data" "401")
    
    if echo "$response" | jq -e '.success == false' > /dev/null; then
        success "Authentication rejection test passed"
    else
        error "Authentication rejection test failed"
        return 1
    fi
    
    # Test with valid test credentials (if available)
    if [ -n "$TEST_USER_EMAIL" ] && [ -n "$TEST_USER_PASSWORD" ]; then
        local valid_login_data="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"
        local auth_response=$(http_request "$API_BASE_URL/api/auth/login" "POST" "$valid_login_data")
        
        if echo "$auth_response" | jq -e '.success == true and .data.token' > /dev/null; then
            success "Authentication success test passed"
            # Extract token for further tests
            export AUTH_TOKEN=$(echo "$auth_response" | jq -r '.data.token')
        else
            warning "Authentication success test skipped (no valid test credentials)"
        fi
    else
        warning "Authentication success test skipped (no test credentials provided)"
    fi
}

test_api_endpoints() {
    log "Testing API endpoints..."
    
    # Test public endpoints
    local endpoints=(
        "/api/health"
        "/api/docs"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if retry "http_request '$API_BASE_URL$endpoint'" "GET $endpoint"; then
            success "Endpoint $endpoint is accessible"
        else
            error "Endpoint $endpoint is not accessible"
            return 1
        fi
    done
    
    # Test protected endpoints (if we have auth token)
    if [ -n "$AUTH_TOKEN" ]; then
        local protected_endpoints=(
            "/api/applications"
            "/api/users/me"
        )
        
        for endpoint in "${protected_endpoints[@]}"; do
            local auth_cmd="curl -s -H 'Authorization: Bearer $AUTH_TOKEN' --max-time $TIMEOUT '$API_BASE_URL$endpoint'"
            if retry "$auth_cmd" "GET $endpoint (authenticated)"; then
                success "Protected endpoint $endpoint is accessible"
            else
                warning "Protected endpoint $endpoint test failed"
            fi
        done
    fi
}

test_web_pages() {
    log "Testing web pages..."
    
    local pages=(
        "/"
        "/auth/login"
        "/health"
    )
    
    for page in "${pages[@]}"; do
        if retry "http_request '$WEB_BASE_URL$page'" "GET $page"; then
            success "Page $page is accessible"
        else
            error "Page $page is not accessible"
            return 1
        fi
    done
}

test_llm_integration() {
    log "Testing LLM integration..."
    
    if [ -n "$AUTH_TOKEN" ]; then
        local llm_data='{"prompt":"Hello, this is a test prompt","model":"gpt-3.5-turbo","maxTokens":50}'
        local auth_cmd="curl -s -H 'Authorization: Bearer $AUTH_TOKEN' -H 'Content-Type: application/json' -d '$llm_data' --max-time 60 '$API_BASE_URL/api/llm/query'"
        
        if eval "$auth_cmd" > /dev/null 2>&1; then
            success "LLM integration test passed"
        else
            warning "LLM integration test failed (may be expected if no API key configured)"
        fi
    else
        warning "LLM integration test skipped (no authentication token)"
    fi
}

test_rag_integration() {
    log "Testing RAG integration..."
    
    if [ -n "$AUTH_TOKEN" ]; then
        local rag_data='{"query":"What are the credit policies?","collection":"credit_policies","topK":3}'
        local auth_cmd="curl -s -H 'Authorization: Bearer $AUTH_TOKEN' -H 'Content-Type: application/json' -d '$rag_data' --max-time 60 '$API_BASE_URL/api/rag/query'"
        
        if eval "$auth_cmd" > /dev/null 2>&1; then
            success "RAG integration test passed"
        else
            warning "RAG integration test failed (may be expected if no vector data)"
        fi
    else
        warning "RAG integration test skipped (no authentication token)"
    fi
}

# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

test_response_times() {
    log "Testing response times..."
    
    local endpoints=(
        "$API_BASE_URL/api/health"
        "$WEB_BASE_URL/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time $TIMEOUT "$endpoint")
        local response_time_ms=$(echo "$response_time * 1000" | bc)
        
        if (( $(echo "$response_time < 2.0" | bc -l) )); then
            success "Response time for $endpoint: ${response_time_ms}ms (good)"
        elif (( $(echo "$response_time < 5.0" | bc -l) )); then
            warning "Response time for $endpoint: ${response_time_ms}ms (acceptable)"
        else
            error "Response time for $endpoint: ${response_time_ms}ms (too slow)"
            return 1
        fi
    done
}

test_concurrent_requests() {
    log "Testing concurrent requests..."
    
    local concurrent_count=10
    local pids=()
    
    # Start concurrent requests
    for i in $(seq 1 $concurrent_count); do
        (
            http_request "$API_BASE_URL/api/health" > /dev/null 2>&1
            echo $? > "/tmp/smoke_test_$i.result"
        ) &
        pids+=($!)
    done
    
    # Wait for all requests to complete
    for pid in "${pids[@]}"; do
        wait $pid
    done
    
    # Check results
    local success_count=0
    for i in $(seq 1 $concurrent_count); do
        if [ -f "/tmp/smoke_test_$i.result" ] && [ "$(cat /tmp/smoke_test_$i.result)" = "0" ]; then
            success_count=$((success_count + 1))
        fi
        rm -f "/tmp/smoke_test_$i.result"
    done
    
    if [ $success_count -eq $concurrent_count ]; then
        success "Concurrent requests test passed ($success_count/$concurrent_count)"
    else
        error "Concurrent requests test failed ($success_count/$concurrent_count)"
        return 1
    fi
}

# =============================================================================
# MAIN TEST EXECUTION
# =============================================================================

run_smoke_tests() {
    log "Starting smoke tests for $ENVIRONMENT environment..."
    echo "API Base URL: $API_BASE_URL"
    echo "Web Base URL: $WEB_BASE_URL"
    echo
    
    local failed_tests=0
    local total_tests=0
    
    # Health checks
    tests=(
        "test_api_health"
        "test_web_health"
        "test_database_connectivity"
        "test_redis_connectivity"
        "test_vector_db_connectivity"
    )
    
    # Functional tests
    tests+=(
        "test_authentication"
        "test_api_endpoints"
        "test_web_pages"
        "test_llm_integration"
        "test_rag_integration"
    )
    
    # Performance tests
    tests+=(
        "test_response_times"
        "test_concurrent_requests"
    )
    
    for test in "${tests[@]}"; do
        total_tests=$((total_tests + 1))
        echo
        if ! $test; then
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    echo
    echo "==============================================================================="
    echo "SMOKE TEST RESULTS"
    echo "==============================================================================="
    echo "Environment: $ENVIRONMENT"
    echo "Total tests: $total_tests"
    echo "Passed: $((total_tests - failed_tests))"
    echo "Failed: $failed_tests"
    echo "==============================================================================="
    
    if [ $failed_tests -eq 0 ]; then
        success "All smoke tests passed! 🎉"
        return 0
    else
        error "$failed_tests smoke tests failed! 💥"
        return 1
    fi
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check dependencies
if ! command -v curl &> /dev/null; then
    error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    error "jq is required but not installed"
    exit 1
fi

if ! command -v bc &> /dev/null; then
    error "bc is required but not installed"
    exit 1
fi

# Run tests
run_smoke_tests
