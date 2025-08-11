#!/bin/bash

# =============================================================================
# BACKUP SCRIPT - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${RETENTION_DAYS:-30}

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

# S3 configuration (optional)
S3_BUCKET=${S3_BUCKET:-}
AWS_REGION=${AWS_REGION:-us-east-1}

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

# Create backup directory
create_backup_dir() {
    local backup_path="$BACKUP_DIR/$TIMESTAMP"
    mkdir -p "$backup_path"
    echo "$backup_path"
}

# Backup PostgreSQL database
backup_database() {
    local backup_path=$1
    local db_backup_file="$backup_path/database.sql"
    
    log_info "Starting database backup..."
    
    # Set password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create database backup
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=custom \
        --file="$db_backup_file.custom" \
        2>/dev/null
    
    # Also create SQL dump for easier inspection
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --clean \
        --if-exists \
        --create \
        --file="$db_backup_file" \
        2>/dev/null
    
    # Compress SQL dump
    gzip "$db_backup_file"
    
    # Get backup size
    local backup_size=$(du -h "$db_backup_file.custom" | cut -f1)
    
    log_success "Database backup completed: $backup_size"
    
    # Cleanup
    unset PGPASSWORD
}

# Backup Redis data
backup_redis() {
    local backup_path=$1
    local redis_backup_file="$backup_path/redis.rdb"
    
    log_info "Starting Redis backup..."
    
    # Create Redis backup using BGSAVE
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    fi
    
    # Wait for backup to complete
    sleep 5
    
    # Copy RDB file
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$redis_backup_file"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$redis_backup_file"
    fi
    
    # Compress backup
    gzip "$redis_backup_file"
    
    local backup_size=$(du -h "$redis_backup_file.gz" | cut -f1)
    log_success "Redis backup completed: $backup_size"
}

# Backup ChromaDB data
backup_chromadb() {
    local backup_path=$1
    local chromadb_backup_dir="$backup_path/chromadb"
    
    log_info "Starting ChromaDB backup..."
    
    mkdir -p "$chromadb_backup_dir"
    
    # Get list of collections
    local collections=$(curl -s "http://$CHROMADB_HOST:$CHROMADB_PORT/api/v1/collections" | jq -r '.[].name' 2>/dev/null || echo "")
    
    if [ -n "$collections" ]; then
        echo "$collections" > "$chromadb_backup_dir/collections.txt"
        
        # Backup each collection
        while IFS= read -r collection; do
            if [ -n "$collection" ]; then
                log_info "Backing up ChromaDB collection: $collection"
                
                # Get collection data
                curl -s "http://$CHROMADB_HOST:$CHROMADB_PORT/api/v1/collections/$collection/get" \
                    -H "Content-Type: application/json" \
                    -d '{"limit": 10000}' \
                    > "$chromadb_backup_dir/$collection.json"
                
                # Get collection metadata
                curl -s "http://$CHROMADB_HOST:$CHROMADB_PORT/api/v1/collections/$collection" \
                    > "$chromadb_backup_dir/$collection.metadata.json"
            fi
        done <<< "$collections"
        
        # Compress ChromaDB backup
        tar -czf "$chromadb_backup_dir.tar.gz" -C "$backup_path" chromadb
        rm -rf "$chromadb_backup_dir"
        
        local backup_size=$(du -h "$chromadb_backup_dir.tar.gz" | cut -f1)
        log_success "ChromaDB backup completed: $backup_size"
    else
        log_warning "No ChromaDB collections found or ChromaDB not accessible"
    fi
}

# Backup application files
backup_application_files() {
    local backup_path=$1
    local files_backup_dir="$backup_path/application_files"
    
    log_info "Starting application files backup..."
    
    mkdir -p "$files_backup_dir"
    
    # Backup configuration files
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        cp "$PROJECT_ROOT/.env.production" "$files_backup_dir/"
    fi
    
    # Backup SSL certificates
    if [ -d "$PROJECT_ROOT/ssl" ]; then
        cp -r "$PROJECT_ROOT/ssl" "$files_backup_dir/"
    fi
    
    # Backup custom configurations
    if [ -d "$PROJECT_ROOT/config" ]; then
        cp -r "$PROJECT_ROOT/config" "$files_backup_dir/"
    fi
    
    # Backup uploaded documents (if any)
    if [ -d "$PROJECT_ROOT/uploads" ]; then
        cp -r "$PROJECT_ROOT/uploads" "$files_backup_dir/"
    fi
    
    # Create metadata file
    cat > "$files_backup_dir/backup_metadata.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "environment": "${NODE_ENV:-production}",
  "backup_type": "full",
  "components": ["database", "redis", "chromadb", "application_files"]
}
EOF
    
    log_success "Application files backup completed"
}

# Upload to S3 (if configured)
upload_to_s3() {
    local backup_path=$1
    
    if [ -n "$S3_BUCKET" ]; then
        log_info "Uploading backup to S3..."
        
        # Create archive
        local archive_name="credit-decision-backup-$TIMESTAMP.tar.gz"
        tar -czf "/tmp/$archive_name" -C "$BACKUP_DIR" "$TIMESTAMP"
        
        # Upload to S3
        aws s3 cp "/tmp/$archive_name" "s3://$S3_BUCKET/backups/$archive_name" \
            --region "$AWS_REGION" \
            --storage-class STANDARD_IA
        
        # Cleanup local archive
        rm "/tmp/$archive_name"
        
        log_success "Backup uploaded to S3: s3://$S3_BUCKET/backups/$archive_name"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [ -n "$S3_BUCKET" ]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$S3_BUCKET/backups/" --region "$AWS_REGION" | \
        awk '{print $4}' | \
        grep "credit-decision-backup-" | \
        while read -r file; do
            local file_date=$(echo "$file" | grep -o '[0-9]\{8\}' | head -1)
            if [ "$file_date" -lt "$cutoff_date" ]; then
                aws s3 rm "s3://$S3_BUCKET/backups/$file" --region "$AWS_REGION"
                log_info "Deleted old S3 backup: $file"
            fi
        done
    fi
    
    log_success "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_path=$1
    
    log_info "Verifying backup integrity..."
    
    local errors=0
    
    # Check database backup
    if [ -f "$backup_path/database.sql.custom" ]; then
        if ! pg_restore --list "$backup_path/database.sql.custom" >/dev/null 2>&1; then
            log_error "Database backup verification failed"
            errors=$((errors + 1))
        fi
    else
        log_error "Database backup file not found"
        errors=$((errors + 1))
    fi
    
    # Check Redis backup
    if [ ! -f "$backup_path/redis.rdb.gz" ]; then
        log_warning "Redis backup file not found"
    fi
    
    # Check ChromaDB backup
    if [ ! -f "$backup_path/chromadb.tar.gz" ]; then
        log_warning "ChromaDB backup file not found"
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Backup verification completed successfully"
        return 0
    else
        log_error "Backup verification failed with $errors errors"
        return 1
    fi
}

# Send notification
send_notification() {
    local status=$1
    local backup_path=$2
    
    if [ -n "$WEBHOOK_URL" ]; then
        local message
        if [ "$status" = "success" ]; then
            message="✅ Credit Decision Platform backup completed successfully at $TIMESTAMP"
        else
            message="❌ Credit Decision Platform backup failed at $TIMESTAMP"
        fi
        
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$message\"}" \
            >/dev/null 2>&1 || true
    fi
}

# Main backup function
main() {
    log_info "Starting Credit Decision Platform backup..."
    log_info "Timestamp: $TIMESTAMP"
    
    # Create backup directory
    local backup_path=$(create_backup_dir)
    log_info "Backup directory: $backup_path"
    
    # Perform backups
    backup_database "$backup_path"
    backup_redis "$backup_path"
    backup_chromadb "$backup_path"
    backup_application_files "$backup_path"
    
    # Verify backup
    if verify_backup "$backup_path"; then
        # Upload to S3 if configured
        upload_to_s3 "$backup_path"
        
        # Cleanup old backups
        cleanup_old_backups
        
        # Calculate total backup size
        local total_size=$(du -sh "$backup_path" | cut -f1)
        log_success "Backup completed successfully! Total size: $total_size"
        
        send_notification "success" "$backup_path"
        exit 0
    else
        log_error "Backup verification failed!"
        send_notification "failure" "$backup_path"
        exit 1
    fi
}

# Handle script arguments
case "${1:-backup}" in
    "backup")
        main
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "verify")
        if [ -n "$2" ]; then
            verify_backup "$2"
        else
            log_error "Please provide backup path for verification"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [backup|cleanup|verify <path>]"
        echo ""
        echo "Commands:"
        echo "  backup  - Perform full backup (default)"
        echo "  cleanup - Clean up old backups"
        echo "  verify  - Verify backup integrity"
        exit 1
        ;;
esac
