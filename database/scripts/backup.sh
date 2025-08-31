#!/bin/bash

# CyberTask Database Backup Script
# This script creates backups of the CyberTask database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration from environment or defaults
DB_NAME="${DB_NAME:-cybertask}"
DB_USER="${DB_USER:-cybertask_user}"
DB_PASSWORD="${DB_PASSWORD:-cybertask_pass}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESS_BACKUPS="${COMPRESS_BACKUPS:-true}"
S3_BACKUP="${S3_BACKUP:-false}"
S3_BUCKET="${S3_BUCKET:-}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create backup directory
setup_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_info "Created backup directory: $BACKUP_DIR"
    fi
}

# Create database backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/cybertask_backup_$timestamp.sql"
    local backup_size
    
    print_info "Creating database backup..."
    print_info "Source: $DB_HOST:$DB_PORT/$DB_NAME"
    print_info "Target: $backup_file"
    
    # Set password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create backup with verbose output and custom format for better compression
    if [ "$1" == "custom" ]; then
        backup_file="$BACKUP_DIR/cybertask_backup_$timestamp.dump"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Fc -v -f "$backup_file" || {
            print_error "Failed to create database backup"
            unset PGPASSWORD
            exit 1
        }
    else
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v > "$backup_file" || {
            print_error "Failed to create database backup"
            unset PGPASSWORD
            exit 1
        }
    fi
    
    unset PGPASSWORD
    
    # Get backup file size
    if [ -f "$backup_file" ]; then
        backup_size=$(du -h "$backup_file" | cut -f1)
        print_status "Backup created successfully"
        print_info "File: $backup_file"
        print_info "Size: $backup_size"
        
        # Compress backup if enabled
        if [ "$COMPRESS_BACKUPS" == "true" ] && [ "$1" != "custom" ]; then
            print_info "Compressing backup..."
            gzip "$backup_file" || {
                print_warning "Failed to compress backup"
            }
            if [ -f "$backup_file.gz" ]; then
                local compressed_size=$(du -h "$backup_file.gz" | cut -f1)
                print_status "Backup compressed"
                print_info "Compressed size: $compressed_size"
                backup_file="$backup_file.gz"
            fi
        fi
        
        # Upload to S3 if enabled
        if [ "$S3_BACKUP" == "true" ] && [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$backup_file"
        fi
        
        # Log backup creation
        log_backup "$backup_file" "$backup_size"
        
    else
        print_error "Backup file was not created"
        exit 1
    fi
}

# Upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    
    print_info "Uploading backup to S3..."
    
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "$backup_file" "s3://$S3_BUCKET/cybertask-backups/$filename" || {
            print_warning "Failed to upload to S3"
            return 1
        }
        print_status "Backup uploaded to S3: s3://$S3_BUCKET/cybertask-backups/$filename"
    else
        print_warning "AWS CLI not found. Cannot upload to S3."
    fi
}

# Log backup information
log_backup() {
    local backup_file="$1"
    local backup_size="$2"
    local log_file="$BACKUP_DIR/backup.log"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "$timestamp | BACKUP | $backup_file | $backup_size" >> "$log_file"
}

# Clean old backups
cleanup_old_backups() {
    print_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm "$file"
        print_info "Deleted: $(basename "$file")"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "cybertask_backup_*.sql*" -o -name "cybertask_backup_*.dump" -type f -mtime +$RETENTION_DAYS -print0)
    
    if [ $deleted_count -gt 0 ]; then
        print_status "Cleaned up $deleted_count old backup files"
        
        # Log cleanup
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo "$timestamp | CLEANUP | Deleted $deleted_count files older than $RETENTION_DAYS days" >> "$BACKUP_DIR/backup.log"
    else
        print_info "No old backup files to clean up"
    fi
}

# Restore database from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file to restore"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will REPLACE the current database with the backup data"
    print_warning "Database: $DB_HOST:$DB_PORT/$DB_NAME"
    print_warning "Backup: $backup_file"
    echo
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
    
    print_info "Restoring database from backup..."
    
    # Set password for psql
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if it's a compressed file
    if [[ "$backup_file" == *.gz ]]; then
        print_info "Decompressing backup file..."
        zcat "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" || {
            print_error "Failed to restore database"
            unset PGPASSWORD
            exit 1
        }
    elif [[ "$backup_file" == *.dump ]]; then
        print_info "Restoring from custom format backup..."
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c -v "$backup_file" || {
            print_error "Failed to restore database"
            unset PGPASSWORD
            exit 1
        }
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$backup_file" || {
            print_error "Failed to restore database"
            unset PGPASSWORD
            exit 1
        }
    fi
    
    unset PGPASSWORD
    
    print_status "Database restored successfully from $backup_file"
    
    # Log restore
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "$timestamp | RESTORE | $backup_file" >> "$BACKUP_DIR/backup.log"
}

# List available backups
list_backups() {
    print_info "Available backups in $BACKUP_DIR:"
    echo
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_warning "Backup directory does not exist: $BACKUP_DIR"
        return
    fi
    
    local backup_files=($(find "$BACKUP_DIR" -name "cybertask_backup_*.sql*" -o -name "cybertask_backup_*.dump" | sort -r))
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        print_warning "No backup files found"
        return
    fi
    
    printf "%-30s %-15s %-20s\n" "FILENAME" "SIZE" "DATE"
    printf "%-30s %-15s %-20s\n" "--------" "----" "----"
    
    for file in "${backup_files[@]}"; do
        local filename=$(basename "$file")
        local size=$(du -h "$file" | cut -f1)
        local date=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
        printf "%-30s %-15s %-20s\n" "$filename" "$size" "$date"
    done
    
    echo
    print_info "Total backups: ${#backup_files[@]}"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file to verify"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_info "Verifying backup integrity: $backup_file"
    
    # Check if it's a compressed file
    if [[ "$backup_file" == *.gz ]]; then
        if gzip -t "$backup_file" 2>/dev/null; then
            print_status "Compressed backup file is valid"
            
            # Check SQL syntax
            if zcat "$backup_file" | head -100 | grep -q "PostgreSQL database dump"; then
                print_status "Backup contains valid PostgreSQL dump"
            else
                print_warning "Backup may not be a valid PostgreSQL dump"
            fi
        else
            print_error "Compressed backup file is corrupted"
            exit 1
        fi
    elif [[ "$backup_file" == *.dump ]]; then
        # For custom format, we can use pg_restore --list
        if pg_restore --list "$backup_file" >/dev/null 2>&1; then
            print_status "Custom format backup is valid"
            
            # Show some statistics
            local table_count=$(pg_restore --list "$backup_file" | grep "TABLE DATA" | wc -l)
            print_info "Tables with data: $table_count"
        else
            print_error "Custom format backup is corrupted"
            exit 1
        fi
    else
        # Plain SQL file
        if head -100 "$backup_file" | grep -q "PostgreSQL database dump"; then
            print_status "Backup contains valid PostgreSQL dump"
        else
            print_warning "Backup may not be a valid PostgreSQL dump"
        fi
        
        # Check for SQL syntax errors (basic check)
        if grep -q "ERROR\|FATAL" "$backup_file"; then
            print_warning "Backup file contains error messages"
        fi
    fi
    
    print_status "Backup verification completed"
}

# Show backup statistics
backup_stats() {
    print_info "Backup Statistics for $BACKUP_DIR"
    echo
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_warning "Backup directory does not exist: $BACKUP_DIR"
        return
    fi
    
    local total_files=$(find "$BACKUP_DIR" -name "cybertask_backup_*" | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    local oldest_backup=$(find "$BACKUP_DIR" -name "cybertask_backup_*" -printf "%T@ %p\n" 2>/dev/null | sort -n | head -1 | cut -d' ' -f2-)
    local newest_backup=$(find "$BACKUP_DIR" -name "cybertask_backup_*" -printf "%T@ %p\n" 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)
    
    echo "📊 Total backup files: $total_files"
    echo "💾 Total storage used: $total_size"
    
    if [ -n "$oldest_backup" ]; then
        echo "📅 Oldest backup: $(basename "$oldest_backup")"
    fi
    
    if [ -n "$newest_backup" ]; then
        echo "🕒 Newest backup: $(basename "$newest_backup")"
    fi
    
    # Show backup log tail if it exists
    if [ -f "$BACKUP_DIR/backup.log" ]; then
        echo
        print_info "Recent backup activity:"
        tail -5 "$BACKUP_DIR/backup.log"
    fi
}

# Show usage information
show_help() {
    echo "CyberTask Database Backup Script"
    echo
    echo "Usage: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  backup [custom]    Create database backup (use 'custom' for pg_dump custom format)"
    echo "  restore <file>     Restore database from backup file"
    echo "  list              List available backup files"
    echo "  cleanup           Remove backups older than retention period"
    echo "  verify <file>     Verify backup file integrity"
    echo "  stats             Show backup statistics"
    echo "  help              Show this help message"
    echo
    echo "Environment Variables:"
    echo "  DB_NAME           Database name (default: cybertask)"
    echo "  DB_USER           Database user (default: cybertask_user)"
    echo "  DB_PASSWORD       Database password (default: cybertask_pass)"
    echo "  DB_HOST           Database host (default: localhost)"
    echo "  DB_PORT           Database port (default: 5432)"
    echo "  BACKUP_DIR        Backup directory (default: ../backups)"
    echo "  RETENTION_DAYS    Days to keep backups (default: 30)"
    echo "  COMPRESS_BACKUPS  Compress backups with gzip (default: true)"
    echo "  S3_BACKUP         Upload backups to S3 (default: false)"
    echo "  S3_BUCKET         S3 bucket name for backups"
    echo
    echo "Examples:"
    echo "  $0 backup                           # Create standard SQL backup"
    echo "  $0 backup custom                    # Create compressed custom format backup"
    echo "  $0 restore ../backups/backup.sql   # Restore from backup"
    echo "  $0 cleanup                          # Clean old backups"
    echo "  DB_NAME=test $0 backup              # Backup different database"
}

# Main execution
main() {
    local command="${1:-backup}"
    
    case "$command" in
        "backup")
            setup_backup_dir
            create_backup "$2"
            cleanup_old_backups
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "verify")
            verify_backup "$2"
            ;;
        "stats")
            backup_stats
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Set script permissions and run
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi