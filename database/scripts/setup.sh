#!/bin/bash

# CyberTask Database Setup Script
# This script sets up the PostgreSQL database for CyberTask

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DB_NAME="${DB_NAME:-cybertask}"
DB_USER="${DB_USER:-cybertask_user}"
DB_PASSWORD="${DB_PASSWORD:-cybertask_pass}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

echo -e "${BLUE}🚀 CyberTask Database Setup${NC}"
echo "=================================="

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

# Check if PostgreSQL is running
check_postgres() {
    print_info "Checking PostgreSQL connection..."
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; then
        print_error "PostgreSQL is not running on $DB_HOST:$DB_PORT"
        print_info "Please start PostgreSQL and try again"
        exit 1
    fi
    print_status "PostgreSQL is running"
}

# Create database and user
setup_database() {
    print_info "Setting up database and user..."
    
    # Check if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_warning "Database '$DB_NAME' already exists"
    else
        print_info "Creating database '$DB_NAME'..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -c "CREATE DATABASE $DB_NAME;" || {
            print_error "Failed to create database"
            exit 1
        }
        print_status "Database '$DB_NAME' created"
    fi
    
    # Check if user exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -t -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        print_warning "User '$DB_USER' already exists"
    else
        print_info "Creating user '$DB_USER'..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
            print_error "Failed to create user"
            exit 1
        }
        print_status "User '$DB_USER' created"
    fi
    
    # Grant privileges
    print_info "Granting privileges..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
    print_status "Privileges granted"
}

# Install required extensions
install_extensions() {
    print_info "Installing PostgreSQL extensions..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || {
        print_error "Failed to install uuid-ossp extension"
        exit 1
    }
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";" || {
        print_error "Failed to install pg_trgm extension"
        exit 1
    }
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"btree_gin\";" || {
        print_error "Failed to install btree_gin extension"
        exit 1
    }
    
    print_status "Extensions installed"
}

# Run schema
apply_schema() {
    print_info "Applying database schema..."
    
    if [ -f "../schema.sql" ]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "../schema.sql" || {
            print_error "Failed to apply schema"
            exit 1
        }
        print_status "Schema applied successfully"
    else
        print_error "Schema file not found at ../schema.sql"
        exit 1
    fi
}

# Setup Prisma (if available)
setup_prisma() {
    print_info "Setting up Prisma..."
    
    if [ -f "../prisma/schema.prisma" ]; then
        # Set DATABASE_URL environment variable
        export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
        
        cd ..
        
        # Check if npm/node is available
        if command -v npm >/dev/null 2>&1; then
            print_info "Installing Prisma dependencies..."
            npm install prisma @prisma/client bcryptjs
            
            print_info "Generating Prisma client..."
            npx prisma generate || {
                print_warning "Failed to generate Prisma client (this is okay if running schema-only setup)"
            }
            
            print_info "Pushing database schema..."
            npx prisma db push || {
                print_warning "Failed to push schema via Prisma (this is okay if schema was applied directly)"
            }
            
            # Run seeds if available
            if [ -f "prisma/seed.ts" ]; then
                print_info "Running database seeds..."
                npx prisma db seed || {
                    print_warning "Failed to run seeds (you may need to run this manually later)"
                }
            fi
            
            print_status "Prisma setup completed"
        else
            print_warning "Node.js/npm not found. Skipping Prisma setup."
            print_info "You can run Prisma setup later with: npx prisma generate && npx prisma db push"
        fi
        
        cd scripts
    else
        print_warning "Prisma schema not found. Skipping Prisma setup."
    fi
}

# Create .env file
create_env_file() {
    print_info "Creating .env file..."
    
    ENV_FILE="../.env"
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    
    cat > "$ENV_FILE" << EOL
# Database Configuration
DATABASE_URL="$DATABASE_URL"
DB_HOST="$DB_HOST"
DB_PORT="$DB_PORT"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASSWORD"

# Application Configuration
NODE_ENV="development"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Email Configuration (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# File Upload Configuration
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760"  # 10MB

# Claude API Configuration (optional)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Redis Configuration (optional)
REDIS_URL="redis://localhost:6379"
EOL

    print_status ".env file created at $ENV_FILE"
    print_warning "Please update the configuration values in .env as needed"
}

# Performance optimization
optimize_database() {
    print_info "Applying performance optimizations..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$DB_NAME" << EOL
-- Increase shared buffers for better performance
-- ALTER SYSTEM SET shared_buffers = '256MB';

-- Increase work memory for complex queries
-- ALTER SYSTEM SET work_mem = '4MB';

-- Enable query planning optimizations
-- ALTER SYSTEM SET random_page_cost = 1.1;

-- Optimize for SSD storage
-- ALTER SYSTEM SET effective_io_concurrency = 200;

-- Auto-vacuum optimization
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;

-- Connection settings
ALTER SYSTEM SET max_connections = 100;

-- Reload configuration
SELECT pg_reload_conf();
EOL
    
    print_status "Performance optimizations applied"
    print_warning "Some settings require PostgreSQL restart to take effect"
}

# Create backup directory and initial backup
setup_backup() {
    print_info "Setting up backup system..."
    
    BACKUP_DIR="../backups"
    mkdir -p "$BACKUP_DIR"
    
    # Create initial backup
    BACKUP_FILE="$BACKUP_DIR/cybertask_initial_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" || {
        print_warning "Failed to create initial backup"
    }
    
    if [ -f "$BACKUP_FILE" ]; then
        print_status "Initial backup created: $BACKUP_FILE"
    fi
    
    # Make backup script executable
    chmod +x backup.sh
    print_status "Backup system configured"
}

# Main execution
main() {
    echo
    print_info "Starting CyberTask database setup..."
    echo
    
    check_postgres
    setup_database
    install_extensions
    apply_schema
    setup_prisma
    create_env_file
    optimize_database
    setup_backup
    
    echo
    echo "=================================="
    print_status "Database setup completed successfully!"
    echo
    print_info "Database Details:"
    echo "  📍 Host: $DB_HOST:$DB_PORT"
    echo "  🗄️  Database: $DB_NAME"
    echo "  👤 User: $DB_USER"
    echo "  🔗 URL: postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME"
    echo
    print_info "Next Steps:"
    echo "  1. Update .env file with your actual configuration"
    echo "  2. Test the connection: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo "  3. Run your application and verify everything works"
    echo "  4. Set up regular backups using backup.sh"
    echo
    print_warning "Remember to:"
    echo "  - Change default passwords in production"
    echo "  - Configure proper firewall rules"
    echo "  - Set up SSL/TLS for production"
    echo "  - Monitor database performance"
    echo
}

# Check command line arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "schema-only")
        check_postgres
        apply_schema
        print_status "Schema applied successfully"
        ;;
    "prisma-only")
        setup_prisma
        ;;
    "backup")
        ./backup.sh
        ;;
    "help"|"-h"|"--help")
        echo "CyberTask Database Setup Script"
        echo
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  setup        Complete database setup (default)"
        echo "  schema-only  Apply schema only"
        echo "  prisma-only  Setup Prisma only"
        echo "  backup       Create database backup"
        echo "  help         Show this help message"
        echo
        echo "Environment Variables:"
        echo "  DB_NAME      Database name (default: cybertask)"
        echo "  DB_USER      Database user (default: cybertask_user)"
        echo "  DB_PASSWORD  Database password (default: cybertask_pass)"
        echo "  DB_HOST      Database host (default: localhost)"
        echo "  DB_PORT      Database port (default: 5432)"
        echo "  POSTGRES_USER PostgreSQL admin user (default: postgres)"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac