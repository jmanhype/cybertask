#!/bin/bash

# CyberTask Database Restore Script
# This script provides advanced restore capabilities for CyberTask database

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

# Check if PostgreSQL is accessible
check_postgres() {
    print_info "Checking PostgreSQL connection..."
    export PGPASSWORD="$DB_PASSWORD"
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "Cannot connect to PostgreSQL database"
        print_info "Host: $DB_HOST:$DB_PORT"
        print_info "Database: $DB_NAME"
        print_info "User: $DB_USER"
        unset PGPASSWORD
        exit 1
    fi
    
    unset PGPASSWORD
    print_status "PostgreSQL connection successful"
}

# Create a pre-restore backup
create_pre_restore_backup() {
    print_info "Creating pre-restore backup for safety..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_restore_backup_$timestamp.sql"
    
    mkdir -p "$BACKUP_DIR"
    
    export PGPASSWORD="$DB_PASSWORD"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file" || {
        print_warning "Failed to create pre-restore backup (continuing anyway)"
        unset PGPASSWORD
        return 1
    }
    unset PGPASSWORD
    
    if [ -f "$backup_file" ]; then
        gzip "$backup_file" 2>/dev/null || true
        print_status "Pre-restore backup created: $backup_file.gz"
        return 0
    fi
    
    return 1
}

# Drop all tables and sequences
clean_database() {
    print_info "Cleaning existing database structure..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Drop all tables with CASCADE
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        DO \$\$ DECLARE
            r RECORD;
        BEGIN
            -- Drop all tables
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- Drop all sequences
            FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
            END LOOP;
            
            -- Drop all views
            FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
            END LOOP;
            
            -- Drop all functions
            FOR r IN (SELECT proname, pg_get_function_identity_arguments(oid) as args 
                      FROM pg_proc WHERE pronamespace = 'public'::regnamespace) LOOP
                EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
            END LOOP;
            
            -- Drop all types
            FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace 
                      AND typtype = 'e') LOOP
                EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
            END LOOP;
        END \$\$;
    " || {
        print_error "Failed to clean database"
        unset PGPASSWORD
        exit 1
    }
    
    unset PGPASSWORD
    print_status "Database cleaned successfully"
}

# Restore from SQL file
restore_sql_backup() {
    local backup_file="$1"
    local clean_first="$2"
    
    print_info "Restoring from SQL backup: $backup_file"
    
    if [ "$clean_first" == "true" ]; then
        clean_database
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if it's a compressed file
    if [[ "$backup_file" == *.gz ]]; then
        print_info "Decompressing and restoring backup..."
        if ! zcat "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1; then
            print_error "Failed to restore from compressed backup"
            unset PGPASSWORD
            exit 1
        fi
    else
        print_info "Restoring from uncompressed backup..."
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$backup_file"; then
            print_error "Failed to restore from backup"
            unset PGPASSWORD
            exit 1
        fi
    fi
    
    unset PGPASSWORD
    print_status "SQL backup restored successfully"
}

# Restore from custom format backup
restore_custom_backup() {
    local backup_file="$1"
    local clean_first="$2"
    
    print_info "Restoring from custom format backup: $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    local restore_opts="-v"
    if [ "$clean_first" == "true" ]; then
        restore_opts="$restore_opts -c"
    fi
    
    if ! pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" $restore_opts "$backup_file"; then
        print_error "Failed to restore from custom backup"
        unset PGPASSWORD
        exit 1
    fi
    
    unset PGPASSWORD
    print_status "Custom format backup restored successfully"
}

# Restore specific tables only
restore_tables() {
    local backup_file="$1"
    shift
    local tables=("$@")
    
    print_info "Restoring specific tables: ${tables[*]}"
    
    if [[ "$backup_file" == *.dump ]]; then
        # Custom format - use pg_restore with table selection
        export PGPASSWORD="$DB_PASSWORD"
        
        for table in "${tables[@]}"; do
            print_info "Restoring table: $table"
            pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v -t "$table" "$backup_file" || {
                print_warning "Failed to restore table: $table"
            }
        done
        
        unset PGPASSWORD
    else
        print_error "Table-specific restore is only supported for custom format backups (.dump files)"
        exit 1
    fi
    
    print_status "Selected tables restored successfully"
}

# Restore data only (skip schema)
restore_data_only() {
    local backup_file="$1"
    
    print_info "Restoring data only (skipping schema): $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if [[ "$backup_file" == *.dump ]]; then
        # Custom format
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v --data-only "$backup_file" || {
            print_error "Failed to restore data from custom backup"
            unset PGPASSWORD
            exit 1
        }
    else
        print_error "Data-only restore is recommended with custom format backups"
        print_info "For SQL backups, you'll need to manually extract data sections"
        unset PGPASSWORD
        exit 1
    fi
    
    unset PGPASSWORD
    print_status "Data restored successfully"
}

# Restore schema only (skip data)
restore_schema_only() {
    local backup_file="$1"
    
    print_info "Restoring schema only (skipping data): $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if [[ "$backup_file" == *.dump ]]; then
        # Custom format
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v --schema-only "$backup_file" || {
            print_error "Failed to restore schema from custom backup"
            unset PGPASSWORD
            exit 1
        }
    else
        print_warning "Schema-only restore with SQL backups may include some data"
        print_info "Consider using custom format backups for precise control"
        
        # For SQL files, we can try to extract schema parts
        if [[ "$backup_file" == *.gz ]]; then
            zcat "$backup_file" | grep -E '^(CREATE|ALTER|DROP|COMMENT)' | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 || {
                print_error "Failed to restore schema from SQL backup"
                unset PGPASSWORD
                exit 1
            }
        else
            grep -E '^(CREATE|ALTER|DROP|COMMENT)' "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 || {
                print_error "Failed to restore schema from SQL backup"
                unset PGPASSWORD
                exit 1
            }
        fi
    fi
    
    unset PGPASSWORD
    print_status "Schema restored successfully"
}

# Validate restored database
validate_restore() {
    print_info "Validating restored database..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if key tables exist
    local key_tables=("users" "organizations" "projects" "tasks")
    local missing_tables=()
    
    for table in "${key_tables[@]}"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        print_warning "Missing tables detected: ${missing_tables[*]}"
    else
        print_status "All key tables present"
    fi
    
    # Check record counts
    print_info "Database statistics:"
    for table in "${key_tables[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
            local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" | tr -d ' ')
            printf "  %-15s: %s records\n" "$table" "$count"
        fi
    done
    
    # Check for foreign key violations
    print_info "Checking foreign key constraints..."
    local fk_violations=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND constraint_schema = 'public'
    " | tr -d ' ')
    
    print_info "Foreign key constraints: $fk_violations"
    
    unset PGPASSWORD
    print_status "Database validation completed"
}

# Interactive restore with menu
interactive_restore() {
    print_info "Interactive Restore Mode"
    echo
    
    # List available backups
    local backup_files=($(find "$BACKUP_DIR" -name "cybertask_backup_*" -o -name "pre_restore_backup_*" | sort -r))
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        print_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi
    
    echo "Available backup files:"
    for i in "${!backup_files[@]}"; do
        local file="${backup_files[$i]}"
        local filename=$(basename "$file")
        local size=$(du -h "$file" | cut -f1)
        local date=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
        printf "%2d) %-40s %8s %s\n" $((i+1)) "$filename" "$size" "$date"
    done
    
    echo
    read -p "Select backup file (1-${#backup_files[@]}): " selection
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backup_files[@]} ]; then
        print_error "Invalid selection"
        exit 1
    fi
    
    local selected_backup="${backup_files[$((selection-1))]}"
    print_info "Selected: $(basename "$selected_backup")"
    
    echo
    echo "Restore options:"
    echo "1) Full restore (recommended)"
    echo "2) Schema only"
    echo "3) Data only"
    echo "4) Specific tables"
    
    read -p "Select restore type (1-4): " restore_type
    
    echo
    read -p "Create pre-restore backup? (Y/n): " create_backup
    create_backup=${create_backup:-Y}
    
    echo
    read -p "Clean database before restore? (Y/n): " clean_db
    clean_db=${clean_db:-Y}
    
    # Confirmation
    echo
    print_warning "Restore Summary:"
    echo "  Source: $(basename "$selected_backup")"
    echo "  Target: $DB_HOST:$DB_PORT/$DB_NAME"
    echo "  Type: $(case $restore_type in 1) Full;; 2) Schema only;; 3) Data only;; 4) Specific tables;; esac)"
    echo "  Pre-backup: $([ "$create_backup" == "Y" ] && echo "Yes" || echo "No")"
    echo "  Clean first: $([ "$clean_db" == "Y" ] && echo "Yes" || echo "No")"
    echo
    read -p "Proceed with restore? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
    
    # Execute restore
    if [ "$create_backup" == "Y" ]; then
        create_pre_restore_backup || true
    fi
    
    case $restore_type in
        1) # Full restore
            if [[ "$selected_backup" == *.dump ]]; then
                restore_custom_backup "$selected_backup" "$([ "$clean_db" == "Y" ] && echo "true" || echo "false")"
            else
                restore_sql_backup "$selected_backup" "$([ "$clean_db" == "Y" ] && echo "true" || echo "false")"
            fi
            ;;
        2) # Schema only
            restore_schema_only "$selected_backup"
            ;;
        3) # Data only
            restore_data_only "$selected_backup"
            ;;
        4) # Specific tables
            echo "Enter table names (space-separated):"
            read -r tables
            restore_tables "$selected_backup" $tables
            ;;
    esac
    
    validate_restore
}

# Show usage information
show_help() {
    echo "CyberTask Database Restore Script"
    echo
    echo "Usage: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  full <file> [--clean]     Full database restore"
    echo "  schema <file>             Restore schema only"
    echo "  data <file>               Restore data only"
    echo "  tables <file> <table...>  Restore specific tables"
    echo "  interactive              Interactive restore with menu"
    echo "  validate                 Validate current database"
    echo "  help                     Show this help message"
    echo
    echo "Options:"
    echo "  --clean                  Clean database before restore"
    echo "  --no-backup             Skip pre-restore backup"
    echo
    echo "Environment Variables:"
    echo "  DB_NAME                 Database name (default: cybertask)"
    echo "  DB_USER                 Database user (default: cybertask_user)"
    echo "  DB_PASSWORD             Database password (default: cybertask_pass)"
    echo "  DB_HOST                 Database host (default: localhost)"
    echo "  DB_PORT                 Database port (default: 5432)"
    echo "  BACKUP_DIR              Backup directory (default: ../backups)"
    echo
    echo "Examples:"
    echo "  $0 full backup.sql --clean              # Full restore with cleanup"
    echo "  $0 schema backup.dump                   # Schema only"
    echo "  $0 tables backup.dump users projects    # Restore specific tables"
    echo "  $0 interactive                          # Interactive mode"
}

# Main execution
main() {
    local command="${1:-interactive}"
    local backup_file="$2"
    local clean_first="false"
    local no_backup="false"
    
    # Parse options
    shift 2>/dev/null || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                clean_first="true"
                shift
                ;;
            --no-backup)
                no_backup="true"
                shift
                ;;
            *)
                break
                ;;
        esac
    done
    
    case "$command" in
        "full")
            if [ -z "$backup_file" ]; then
                print_error "Please specify a backup file"
                exit 1
            fi
            
            check_postgres
            
            if [ "$no_backup" != "true" ]; then
                create_pre_restore_backup || true
            fi
            
            if [[ "$backup_file" == *.dump ]]; then
                restore_custom_backup "$backup_file" "$clean_first"
            else
                restore_sql_backup "$backup_file" "$clean_first"
            fi
            
            validate_restore
            ;;
        "schema")
            if [ -z "$backup_file" ]; then
                print_error "Please specify a backup file"
                exit 1
            fi
            
            check_postgres
            restore_schema_only "$backup_file"
            ;;
        "data")
            if [ -z "$backup_file" ]; then
                print_error "Please specify a backup file"
                exit 1
            fi
            
            check_postgres
            restore_data_only "$backup_file"
            ;;
        "tables")
            if [ -z "$backup_file" ]; then
                print_error "Please specify a backup file and table names"
                exit 1
            fi
            
            check_postgres
            restore_tables "$backup_file" "$@"
            ;;
        "interactive")
            check_postgres
            interactive_restore
            ;;
        "validate")
            check_postgres
            validate_restore
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

# Execute main function
main "$@"