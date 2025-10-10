#!/bin/bash

# CyberTask Database Migration Script
# This script handles database schema migrations and version management

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
MIGRATIONS_DIR="../prisma/migrations"

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

# Create migrations table if it doesn't exist
create_migrations_table() {
    print_info "Setting up migrations tracking..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS _prisma_migrations (
            id VARCHAR(36) PRIMARY KEY,
            checksum VARCHAR(64) NOT NULL,
            finished_at TIMESTAMPTZ,
            migration_name VARCHAR(255) NOT NULL,
            logs TEXT,
            rolled_back_at TIMESTAMPTZ,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            applied_steps_count INTEGER NOT NULL DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS _prisma_migrations_migration_name_idx ON _prisma_migrations (migration_name);
    " || {
        print_error "Failed to create migrations table"
        unset PGPASSWORD
        exit 1
    }
    
    unset PGPASSWORD
    print_status "Migrations table ready"
}

# List all available migrations
list_migrations() {
    print_info "Available migrations:"
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        print_warning "Migrations directory not found: $MIGRATIONS_DIR"
        return
    fi
    
    local migrations=($(find "$MIGRATIONS_DIR" -name "migration.sql" -exec dirname {} \; | sort))
    
    if [ ${#migrations[@]} -eq 0 ]; then
        print_warning "No migrations found"
        return
    fi
    
    printf "%-40s %-12s %-20s\n" "MIGRATION" "STATUS" "APPLIED"
    printf "%-40s %-12s %-20s\n" "---------" "------" "-------"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    for migration_dir in "${migrations[@]}"; do
        local migration_name=$(basename "$migration_dir")
        local status="pending"
        local applied_date=""
        
        # Check if migration is applied
        local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$migration_name';
        " 2>/dev/null | tr -d ' ' || echo "0")
        
        if [ "$count" -gt 0 ]; then
            status="applied"
            applied_date=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                SELECT finished_at FROM _prisma_migrations WHERE migration_name = '$migration_name';
            " 2>/dev/null | tr -d ' ' || echo "unknown")
        fi
        
        printf "%-40s %-12s %-20s\n" "$migration_name" "$status" "$applied_date"
    done
    
    unset PGPASSWORD
}

# Get migration status
migration_status() {
    print_info "Migration status for database: $DB_NAME"
    echo
    
    check_postgres
    create_migrations_table
    list_migrations
    
    echo
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Count applied migrations
    local applied_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;
    " | tr -d ' ')
    
    # Count total migrations
    local total_count=$(find "$MIGRATIONS_DIR" -name "migration.sql" 2>/dev/null | wc -l)
    
    unset PGPASSWORD
    
    print_info "Applied migrations: $applied_count"
    print_info "Total migrations: $total_count"
    
    if [ "$applied_count" -eq "$total_count" ]; then
        print_status "Database is up to date"
    else
        print_warning "Database needs migration: $((total_count - applied_count)) pending"
    fi
}

# Apply specific migration
apply_migration() {
    local migration_name="$1"
    local migration_dir="$MIGRATIONS_DIR/$migration_name"
    local migration_file="$migration_dir/migration.sql"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        exit 1
    fi
    
    print_info "Applying migration: $migration_name"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if already applied
    local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$migration_name';
    " | tr -d ' ')
    
    if [ "$count" -gt 0 ]; then
        print_warning "Migration already applied: $migration_name"
        unset PGPASSWORD
        return
    fi
    
    # Generate migration ID and checksum
    local migration_id=$(uuidgen)
    local checksum=$(md5sum "$migration_file" | cut -d' ' -f1)
    
    # Start transaction and apply migration
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 << EOF
BEGIN;

-- Record migration start
INSERT INTO _prisma_migrations (id, migration_name, checksum, started_at) 
VALUES ('$migration_id', '$migration_name', '$checksum', NOW());

-- Apply migration
\i $migration_file

-- Mark migration as finished
UPDATE _prisma_migrations 
SET finished_at = NOW(), applied_steps_count = 1 
WHERE id = '$migration_id';

COMMIT;
EOF

    if [ $? -eq 0 ]; then
        print_status "Migration applied successfully: $migration_name"
    else
        print_error "Failed to apply migration: $migration_name"
        unset PGPASSWORD
        exit 1
    fi
    
    unset PGPASSWORD
}

# Apply all pending migrations
migrate_up() {
    print_info "Applying all pending migrations..."
    
    check_postgres
    create_migrations_table
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        print_warning "Migrations directory not found: $MIGRATIONS_DIR"
        return
    fi
    
    local migrations=($(find "$MIGRATIONS_DIR" -name "migration.sql" -exec dirname {} \; | sort))
    local applied_count=0
    local skipped_count=0
    
    export PGPASSWORD="$DB_PASSWORD"
    
    for migration_dir in "${migrations[@]}"; do
        local migration_name=$(basename "$migration_dir")
        
        # Check if already applied
        local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$migration_name';
        " | tr -d ' ')
        
        if [ "$count" -gt 0 ]; then
            print_info "Skipping (already applied): $migration_name"
            ((skipped_count++))
        else
            apply_migration "$migration_name"
            ((applied_count++))
        fi
    done
    
    unset PGPASSWORD
    
    echo
    print_status "Migration completed"
    print_info "Applied: $applied_count migrations"
    print_info "Skipped: $skipped_count migrations"
}

# Rollback specific migration
rollback_migration() {
    local migration_name="$1"
    
    if [ -z "$migration_name" ]; then
        print_error "Please specify migration name to rollback"
        exit 1
    fi
    
    print_warning "Rolling back migration: $migration_name"
    print_warning "This will mark the migration as rolled back but won't undo schema changes"
    echo
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Rollback cancelled"
        exit 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if migration exists and is applied
    local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM _prisma_migrations 
        WHERE migration_name = '$migration_name' AND finished_at IS NOT NULL;
    " | tr -d ' ')
    
    if [ "$count" -eq 0 ]; then
        print_error "Migration not found or not applied: $migration_name"
        unset PGPASSWORD
        exit 1
    fi
    
    # Mark as rolled back
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        UPDATE _prisma_migrations 
        SET rolled_back_at = NOW() 
        WHERE migration_name = '$migration_name';
    " || {
        print_error "Failed to rollback migration"
        unset PGPASSWORD
        exit 1
    }
    
    unset PGPASSWORD
    
    print_status "Migration marked as rolled back: $migration_name"
    print_warning "Note: Schema changes were NOT automatically undone"
}

# Create new migration
create_migration() {
    local migration_name="$1"
    
    if [ -z "$migration_name" ]; then
        print_error "Please specify migration name"
        exit 1
    fi
    
    # Generate timestamp-based migration directory
    local timestamp=$(date +%Y%m%d%H%M%S)
    local migration_dir="$MIGRATIONS_DIR/${timestamp}_${migration_name}"
    
    mkdir -p "$migration_dir"
    
    # Create migration.sql file with template
    cat > "$migration_dir/migration.sql" << 'EOF'
-- Migration: {{MIGRATION_NAME}}
-- Created: {{TIMESTAMP}}
-- Description: Add your migration description here

BEGIN;

-- Add your SQL migration statements here
-- Example:
-- ALTER TABLE users ADD COLUMN new_field VARCHAR(100);
-- CREATE INDEX idx_users_new_field ON users(new_field);

COMMIT;
EOF

    # Replace placeholders
    sed -i "s/{{MIGRATION_NAME}}/$migration_name/g" "$migration_dir/migration.sql"
    sed -i "s/{{TIMESTAMP}}/$(date)/g" "$migration_dir/migration.sql"
    
    print_status "Migration created: $migration_dir"
    print_info "Edit the migration.sql file and then run: $0 migrate"
    
    # Open in editor if available
    if command -v ${EDITOR:-nano} >/dev/null 2>&1; then
        read -p "Open migration file in editor? (y/n): " edit_now
        if [ "$edit_now" = "y" ]; then
            ${EDITOR:-nano} "$migration_dir/migration.sql"
        fi
    fi
}

# Reset migrations (dangerous)
reset_migrations() {
    print_warning "This will remove ALL migration records from the database"
    print_warning "Schema changes will NOT be undone - only migration tracking will be reset"
    print_error "This operation is DANGEROUS and should only be used in development"
    echo
    read -p "Are you absolutely sure? Type 'RESET' to continue: " confirm
    
    if [ "$confirm" != "RESET" ]; then
        print_info "Reset cancelled"
        exit 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        TRUNCATE TABLE _prisma_migrations;
    " || {
        print_error "Failed to reset migrations"
        unset PGPASSWORD
        exit 1
    }
    
    unset PGPASSWORD
    
    print_status "Migration tracking reset"
    print_warning "You may need to manually clean up your database schema"
}

# Generate migration from schema diff
generate_migration() {
    print_info "Generating migration from Prisma schema..."
    
    if [ ! -f "../prisma/schema.prisma" ]; then
        print_error "Prisma schema not found"
        exit 1
    fi
    
    if ! command -v npx >/dev/null 2>&1; then
        print_error "Node.js/npx not found"
        exit 1
    fi
    
    cd ..
    
    # Set DATABASE_URL
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    
    # Generate migration
    npx prisma migrate dev --create-only || {
        print_error "Failed to generate migration"
        exit 1
    }
    
    cd scripts
    
    print_status "Migration generated"
    print_info "Review the generated migration and run: $0 migrate"
}

# Show migration details
show_migration() {
    local migration_name="$1"
    
    if [ -z "$migration_name" ]; then
        print_error "Please specify migration name"
        exit 1
    fi
    
    local migration_dir="$MIGRATIONS_DIR/$migration_name"
    local migration_file="$migration_dir/migration.sql"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        exit 1
    fi
    
    print_info "Migration: $migration_name"
    print_info "File: $migration_file"
    echo
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Get migration status from database
    local migration_info=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT 
            CASE WHEN finished_at IS NOT NULL THEN 'Applied' ELSE 'Pending' END as status,
            started_at,
            finished_at,
            rolled_back_at
        FROM _prisma_migrations 
        WHERE migration_name = '$migration_name';
    " 2>/dev/null || echo "")
    
    unset PGPASSWORD
    
    if [ -n "$migration_info" ]; then
        echo "Status: $migration_info"
    else
        echo "Status: Not tracked (never run)"
    fi
    
    echo
    echo "Migration content:"
    echo "=================="
    cat "$migration_file"
}

# Show usage information
show_help() {
    echo "CyberTask Database Migration Script"
    echo
    echo "Usage: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  status                    Show migration status"
    echo "  migrate                   Apply all pending migrations"
    echo "  rollback <migration>      Mark migration as rolled back"
    echo "  create <name>             Create new migration file"
    echo "  generate                  Generate migration from Prisma schema"
    echo "  show <migration>          Show migration details"
    echo "  reset                     Reset migration tracking (DANGEROUS)"
    echo "  list                      List all migrations"
    echo "  help                      Show this help message"
    echo
    echo "Environment Variables:"
    echo "  DB_NAME                   Database name (default: cybertask)"
    echo "  DB_USER                   Database user (default: cybertask_user)"
    echo "  DB_PASSWORD               Database password (default: cybertask_pass)"
    echo "  DB_HOST                   Database host (default: localhost)"
    echo "  DB_PORT                   Database port (default: 5432)"
    echo
    echo "Examples:"
    echo "  $0 status                           # Check migration status"
    echo "  $0 migrate                          # Apply all pending migrations"
    echo "  $0 create add_user_preferences      # Create new migration"
    echo "  $0 show 20250101120000_init         # Show specific migration"
    echo "  $0 rollback 20250101120000_init     # Rollback migration"
}

# Main execution
main() {
    local command="${1:-status}"
    local argument="$2"
    
    case "$command" in
        "status")
            migration_status
            ;;
        "migrate"|"up")
            migrate_up
            ;;
        "rollback")
            rollback_migration "$argument"
            ;;
        "create")
            create_migration "$argument"
            ;;
        "generate")
            generate_migration
            ;;
        "show")
            show_migration "$argument"
            ;;
        "reset")
            check_postgres
            create_migrations_table
            reset_migrations
            ;;
        "list")
            check_postgres
            create_migrations_table
            list_migrations
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