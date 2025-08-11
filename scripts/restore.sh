#!/bin/bash

# =============================================================================
# RESTORE SCRIPT - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-credit_decision_db}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Redis configuration
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

# ChromaDB configuration
CHROMADB_HOST=${CHROMADB_HOST:-localhost}
CHROMADB_PORT=${CHROMADB_PORT:-8000}

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

# List available backups
list_backups() {
    log_info "Available backups:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        for backup in $(ls -1 "$BACKUP_DIR" | grep "^20" | sort -r); do
            local backup_path="$BACKUP_DIR/$backup"
            local backup_size=$(du -sh "$backup_path" 2>/dev/null | cut -f1 || echo "Unknown")
            local backup_date=$(echo "$backup" | sed 's/_/ /' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3/')
            
            echo "  📁 $backup ($backup_size) - $backup_date"
            
            # Show backup contents
            if [ -f "$backup_path/backup_metadata.json" ]; then
                local components=$(jq -r '.components[]' "$backup_path/backup_metadata.json" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
                echo "     Components: $components"
            fi
            echo ""
        done
    else
        log_warning "Backup directory not found: $BACKUP_DIR"
    fi
}

# Validate backup
validate_backup() {
    local backup_path=$1
    
    log_info "Validating backup: $backup_path"
    
    if [ ! -d "$backup_path" ]; then
        log_error "Backup directory not found: $backup_path"
        return 1
    fi
    
    local errors=0
    
    # Check database backup
    if [ -f "$backup_path/database.sql.custom" ]; then
        if ! pg_restore --list "$backup_path/database.sql.custom" >/dev/null 2>&1; then
            log_error "Invalid database backup file"
            errors=$((errors + 1))
        else
            log_success "Database backup is valid"
        fi
    else
        log_warning "Database backup not found"
    fi
    
    # Check Redis backup
    if [ -f "$backup_path/redis.rdb.gz" ]; then
        if ! gunzip -t "$backup_path/redis.rdb.gz" 2>/dev/null; then
            log_error "Invalid Redis backup file"
            errors=$((errors + 1))
        else
            log_success "Redis backup is valid"
        fi
    else
        log_warning "Redis backup not found"
    fi
    
    # Check ChromaDB backup
    if [ -f "$backup_path/chromadb.tar.gz" ]; then
        if ! tar -tzf "$backup_path/chromadb.tar.gz" >/dev/null 2>&1; then
            log_error "Invalid ChromaDB backup file"
            errors=$((errors + 1))
        else
            log_success "ChromaDB backup is valid"
        fi
    else
        log_warning "ChromaDB backup not found"
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Backup validation completed successfully"
        return 0
    else
        log_error "Backup validation failed with $errors errors"
        return 1
    fi
}

# Stop services
stop_services() {
    log_info "Stopping services..."
    
    # Stop Docker Compose services
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose stop api web || true
        log_success "Services stopped"
    else
        log_warning "docker-compose.yml not found, skipping service stop"
    fi
}

# Start services
start_services() {
    log_info "Starting services..."
    
    # Start Docker Compose services
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose up -d
        
        # Wait for services to be ready
        log_info "Waiting for services to be ready..."
        sleep 30
        
        # Check service health
        if curl -f http://localhost:3001/health >/dev/null 2>&1; then
            log_success "API service is healthy"
        else
            log_warning "API service health check failed"
        fi
        
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            log_success "Web service is healthy"
        else
            log_warning "Web service health check failed"
        fi
    else
        log_warning "docker-compose.yml not found, skipping service start"
    fi
}

# Restore database
restore_database() {
    local backup_path=$1
    local db_backup_file="$backup_path/database.sql.custom"
    
    if [ ! -f "$db_backup_file" ]; then
        log_warning "Database backup not found, skipping database restore"
        return 0
    fi
    
    log_info "Restoring database..."
    
    # Set password for pg_restore
    export PGPASSWORD="$DB_PASSWORD"
    
    # Drop existing database connections
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
        2>/dev/null || true
    
    # Restore database
    pg_restore \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --clean \
        --if-exists \
        --create \
        --verbose \
        "$db_backup_file" \
        2>/dev/null
    
    # Cleanup
    unset PGPASSWORD
    
    log_success "Database restore completed"
}

# Restore Redis
restore_redis() {
    local backup_path=$1
    local redis_backup_file="$backup_path/redis.rdb.gz"
    
    if [ ! -f "$redis_backup_file" ]; then
        log_warning "Redis backup not found, skipping Redis restore"
        return 0
    fi
    
    log_info "Restoring Redis..."
    
    # Flush existing Redis data
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" FLUSHALL
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FLUSHALL
    fi
    
    # Decompress and restore Redis data
    local temp_rdb="/tmp/dump.rdb"
    gunzip -c "$redis_backup_file" > "$temp_rdb"
    
    # Stop Redis, replace RDB file, and restart
    # Note: This approach depends on your Redis setup
    log_warning "Redis restore requires manual intervention - please replace the RDB file and restart Redis"
    log_info "Backup file location: $temp_rdb"
    
    log_success "Redis restore prepared (manual intervention required)"
}

# Restore ChromaDB
restore_chromadb() {
    local backup_path=$1
    local chromadb_backup_file="$backup_path/chromadb.tar.gz"
    
    if [ ! -f "$chromadb_backup_file" ]; then
        log_warning "ChromaDB backup not found, skipping ChromaDB restore"
        return 0
    fi
    
    log_info "Restoring ChromaDB..."
    
    # Extract backup
    local temp_dir="/tmp/chromadb_restore_$$"
    mkdir -p "$temp_dir"
    tar -xzf "$chromadb_backup_file" -C "$temp_dir"
    
    # Get list of collections
    local collections_file="$temp_dir/chromadb/collections.txt"
    if [ -f "$collections_file" ]; then
        while IFS= read -r collection; do
            if [ -n "$collection" ]; then
                log_info "Restoring ChromaDB collection: $collection"
                
                # Delete existing collection
                curl -X DELETE "http://$CHROMADB_HOST:$CHROMADB_PORT/api/v1/collections/$collection" \
                    2>/dev/null || true
                
                # Create collection
                local metadata_file="$temp_dir/chromadb/$collection.metadata.json"
                if [ -f "$metadata_file" ]; then
                    curl -X POST "http://$CHROMADB_HOST:$CHROMADB_PORT/api/v1/collections" \
                        -H "Content-Type: application/json" \
                        -d @"$metadata_file" \
                        2>/dev/null || true
                fi
                
                # Restore collection data
                local data_file="$temp_dir/chromadb/$collection.json"
                if [ -f "$data_file" ]; then
                    curl -X POST "http://$CHROMADB_HOST:$CHROMADB_PORT/api/v1/collections/$collection/add" \
                        -H "Content-Type: application/json" \
                        -d @"$data_file" \
                        2>/dev/null || true
                fi
            fi
        done < "$collections_file"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "ChromaDB restore completed"
}

# Restore application files
restore_application_files() {
    local backup_path=$1
    local files_backup_dir="$backup_path/application_files"
    
    if [ ! -d "$files_backup_dir" ]; then
        log_warning "Application files backup not found, skipping file restore"
        return 0
    fi
    
    log_info "Restoring application files..."
    
    # Restore configuration files
    if [ -f "$files_backup_dir/.env.production" ]; then
        cp "$files_backup_dir/.env.production" "$PROJECT_ROOT/"
        log_info "Restored .env.production"
    fi
    
    # Restore SSL certificates
    if [ -d "$files_backup_dir/ssl" ]; then
        cp -r "$files_backup_dir/ssl" "$PROJECT_ROOT/"
        log_info "Restored SSL certificates"
    fi
    
    # Restore custom configurations
    if [ -d "$files_backup_dir/config" ]; then
        cp -r "$files_backup_dir/config" "$PROJECT_ROOT/"
        log_info "Restored configuration files"
    fi
    
    # Restore uploaded documents
    if [ -d "$files_backup_dir/uploads" ]; then
        cp -r "$files_backup_dir/uploads" "$PROJECT_ROOT/"
        log_info "Restored uploaded documents"
    fi
    
    log_success "Application files restore completed"
}

# Confirm restore operation
confirm_restore() {
    local backup_path=$1
    
    echo ""
    log_warning "⚠️  RESTORE OPERATION WARNING ⚠️"
    echo ""
    echo "This operation will:"
    echo "  • Stop all services"
    echo "  • Replace the current database with backup data"
    echo "  • Replace Redis cache data"
    echo "  • Replace ChromaDB vector data"
    echo "  • Replace application configuration files"
    echo ""
    echo "Backup to restore: $backup_path"
    echo ""
    echo "Current data will be PERMANENTLY LOST!"
    echo ""
    
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "Restore operation cancelled"
        exit 0
    fi
    
    echo ""
    log_info "Restore operation confirmed"
}

# Main restore function
restore_backup() {
    local backup_identifier=$1
    
    # Determine backup path
    local backup_path
    if [ -d "$backup_identifier" ]; then
        backup_path="$backup_identifier"
    elif [ -d "$BACKUP_DIR/$backup_identifier" ]; then
        backup_path="$BACKUP_DIR/$backup_identifier"
    else
        log_error "Backup not found: $backup_identifier"
        exit 1
    fi
    
    log_info "Starting restore operation..."
    log_info "Backup path: $backup_path"
    
    # Validate backup
    if ! validate_backup "$backup_path"; then
        log_error "Backup validation failed"
        exit 1
    fi
    
    # Confirm restore
    confirm_restore "$backup_path"
    
    # Stop services
    stop_services
    
    # Perform restore
    restore_database "$backup_path"
    restore_redis "$backup_path"
    restore_chromadb "$backup_path"
    restore_application_files "$backup_path"
    
    # Start services
    start_services
    
    log_success "Restore operation completed successfully!"
    echo ""
    log_info "Please verify that all services are working correctly:"
    echo "  • Web Application: http://localhost:3000"
    echo "  • API: http://localhost:3001"
    echo "  • API Health: http://localhost:3001/health"
}

# Handle script arguments
case "${1:-help}" in
    "list")
        list_backups
        ;;
    "validate")
        if [ -n "$2" ]; then
            validate_backup "$2"
        else
            log_error "Please provide backup path for validation"
            exit 1
        fi
        ;;
    "restore")
        if [ -n "$2" ]; then
            restore_backup "$2"
        else
            log_error "Please provide backup identifier for restore"
            echo ""
            echo "Available backups:"
            list_backups
            exit 1
        fi
        ;;
    *)
        echo "Credit Decision Platform - Restore Script"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  list                    - List available backups"
        echo "  validate <backup_path>  - Validate backup integrity"
        echo "  restore <backup_id>     - Restore from backup"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 validate 20240101_120000"
        echo "  $0 restore 20240101_120000"
        echo ""
        exit 1
        ;;
esac
