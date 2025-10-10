# CyberTask Database

A comprehensive PostgreSQL database setup for the CyberTask project management platform with AI-powered features and Claude Flow integration.

## 🚀 Quick Start

```bash
# Navigate to database directory
cd /Users/speed/Downloads/experiments/cybertask/database

# Make scripts executable
chmod +x scripts/*.sh

# Setup database
./scripts/setup.sh

# Verify installation
./scripts/backup.sh stats
```

## 📁 Project Structure

```
database/
├── schema.sql              # Complete PostgreSQL schema
├── prisma/
│   ├── schema.prisma       # Prisma ORM schema
│   ├── seed.ts            # Database seed data
│   └── migrations/        # Prisma migrations
├── scripts/
│   ├── setup.sh           # Database setup script
│   ├── backup.sh          # Backup management
│   ├── restore.sh         # Restore utilities
│   └── migrate.sh         # Migration management
├── backups/               # Backup storage
├── docs/                  # Documentation
└── README.md              # This file
```

## 🗄️ Database Schema

### Core Tables

- **Users & Authentication**: `users`, `roles`, `user_roles`, `oauth_providers`
- **Organizations**: `organizations`, `organization_members`, `teams`, `team_members`
- **Projects**: `projects`, `tasks`, `task_dependencies`, `task_comments`
- **File Management**: `attachments`, `time_entries`
- **Notifications**: `notifications`, `activity_logs`
- **AI Integration**: `ai_analyses`, `claude_workflows`

### Key Features

- **UUID Primary Keys**: All tables use UUID for scalability
- **Full-Text Search**: Integrated PostgreSQL text search
- **Audit Trail**: Comprehensive activity logging
- **AI Enhancement**: Built-in AI analysis fields
- **Row Level Security**: Security policies for multi-tenancy
- **Performance Optimized**: Strategic indexes and materialized views

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the database directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://cybertask_user:cybertask_pass@localhost:5432/cybertask"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cybertask"
DB_USER="cybertask_user"
DB_PASSWORD="cybertask_pass"

# Application Configuration
NODE_ENV="development"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Claude API (optional)
ANTHROPIC_API_KEY="your-api-key"
```

### PostgreSQL Extensions

Required extensions (automatically installed):
- `uuid-ossp` - UUID generation
- `pg_trgm` - Trigram matching for search
- `btree_gin` - Advanced indexing

## 🛠️ Database Scripts

### Setup Script (`setup.sh`)

Complete database initialization:

```bash
# Full setup (recommended)
./scripts/setup.sh

# Schema only
./scripts/setup.sh schema-only

# Prisma setup only
./scripts/setup.sh prisma-only

# With custom configuration
DB_NAME=myapp DB_USER=myuser ./scripts/setup.sh
```

### Backup Script (`backup.sh`)

Comprehensive backup management:

```bash
# Create backup
./scripts/backup.sh backup

# Create compressed custom format backup
./scripts/backup.sh backup custom

# List backups
./scripts/backup.sh list

# Clean old backups
./scripts/backup.sh cleanup

# Show statistics
./scripts/backup.sh stats

# Verify backup
./scripts/backup.sh verify backup_file.sql
```

### Restore Script (`restore.sh`)

Advanced restore capabilities:

```bash
# Interactive restore (recommended)
./scripts/restore.sh interactive

# Full restore
./scripts/restore.sh full backup_file.sql --clean

# Schema only
./scripts/restore.sh schema backup_file.dump

# Data only
./scripts/restore.sh data backup_file.dump

# Specific tables
./scripts/restore.sh tables backup_file.dump users projects

# Validate database
./scripts/restore.sh validate
```

### Migration Script (`migrate.sh`)

Database version management:

```bash
# Check migration status
./scripts/migrate.sh status

# Apply all pending migrations
./scripts/migrate.sh migrate

# Create new migration
./scripts/migrate.sh create add_new_feature

# Generate from Prisma schema
./scripts/migrate.sh generate

# Show migration details
./scripts/migrate.sh show 20250101120000_init

# List all migrations
./scripts/migrate.sh list
```

## 🔗 Prisma Integration

### Setup

The database includes full Prisma ORM integration:

```bash
# Install dependencies
npm install prisma @prisma/client

# Generate client
npx prisma generate

# Apply schema to database
npx prisma db push

# Run seeds
npx prisma db seed
```

### Schema Features

- **Type-safe database access**
- **Automatic migrations**
- **Rich data modeling**
- **Query optimization**
- **Full-text search support**

## 🌱 Sample Data

The seed script provides comprehensive test data:

### Test Accounts

```
admin@cybertask.ai / admin123 (System Admin)
john.doe@cybertask.ai / password123 (Org Owner)
jane.smith@cybertask.ai / password123 (Project Manager)
alice.johnson@cybertask.ai / password123 (Developer)
bob.wilson@cybertask.ai / password123 (Developer)
```

### Sample Data Includes

- **2 Organizations** with different subscription tiers
- **3 Teams** with role-based memberships
- **4 Projects** in various states
- **8 Tasks** with dependencies and comments
- **AI Analyses** and workflow examples
- **Time tracking entries**
- **Notifications and activity logs**

## 🤖 AI Integration

### Claude Flow Features

The database is designed for AI-powered project management:

```sql
-- AI-enhanced task fields
ai_priority_score    DECIMAL(3,2)  -- AI-calculated priority
ai_complexity_score  DECIMAL(3,2)  -- AI-calculated complexity
ai_insights         JSONB         -- AI recommendations

-- AI analysis tracking
CREATE TABLE ai_analyses (
    entity_type     VARCHAR(50),  -- 'task', 'project', 'workflow'
    analysis_type   VARCHAR(50),  -- 'priority', 'complexity', 'optimization'
    input_data      JSONB,        -- Analysis input
    output_data     JSONB,        -- AI recommendations
    confidence_score DECIMAL(3,2) -- Confidence level
);

-- Claude workflows
CREATE TABLE claude_workflows (
    workflow_config    JSONB,       -- Workflow definition
    trigger_conditions JSONB,       -- When to execute
    execution_count    INTEGER,     -- Usage tracking
    active            BOOLEAN       -- Enable/disable
);
```

## 🔍 Full-Text Search

Advanced search capabilities across entities:

```sql
-- Search users
SELECT * FROM users 
WHERE search_vector @@ to_tsquery('english', 'john & developer');

-- Search projects
SELECT * FROM projects 
WHERE search_vector @@ to_tsquery('english', 'web & application');

-- Search tasks with ranking
SELECT title, ts_rank(search_vector, query) as rank
FROM tasks, to_tsquery('english', 'authentication & security') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

## 📊 Performance Optimization

### Indexes

Strategic indexing for common queries:

```sql
-- User lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Task queries
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Search indexes
CREATE INDEX idx_tasks_search ON tasks USING gin(search_vector);
CREATE INDEX idx_tasks_labels ON tasks USING gin(labels);
```

### Materialized Views

Pre-computed analytics for dashboards:

```sql
-- Dashboard metrics
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
    p.organization_id,
    p.id as project_id,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
    AVG(t.ai_priority_score) as avg_priority_score
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.organization_id, p.id;
```

## 🔒 Security Features

### Row Level Security (RLS)

Multi-tenant security policies:

```sql
-- Users can only see their own data
CREATE POLICY user_own_data ON users
    FOR ALL USING (id = current_setting('app.current_user_id')::UUID);

-- Organization-based access
CREATE POLICY org_member_access ON organizations
    FOR ALL USING (id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = current_setting('app.current_user_id')::UUID
    ));
```

### Audit Trail

Comprehensive activity logging:

```sql
CREATE TABLE activity_logs (
    user_id         UUID,
    organization_id UUID,
    entity_type     VARCHAR(50),  -- 'task', 'project', 'user'
    entity_id       UUID,
    action          VARCHAR(50),  -- 'created', 'updated', 'deleted'
    details         JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

## 📈 Monitoring & Maintenance

### Performance Monitoring

```sql
-- Query performance view
CREATE VIEW performance_metrics AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public';
```

### Automated Maintenance

```sql
-- Auto-vacuum optimization
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;

-- Cleanup old activity logs
CREATE OR REPLACE FUNCTION archive_old_activity_logs()
RETURNS INTEGER AS $$
BEGIN
    DELETE FROM activity_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    RETURN ROW_COUNT;
END;
$$ LANGUAGE plpgsql;
```

## 🚀 Production Deployment

### Checklist

- [ ] Change default passwords
- [ ] Configure SSL/TLS connections
- [ ] Set up database connection pooling
- [ ] Configure backup schedule
- [ ] Enable monitoring and alerting
- [ ] Set up read replicas (if needed)
- [ ] Configure firewall rules
- [ ] Test disaster recovery procedures

### Recommended Settings

```sql
-- Production PostgreSQL settings
shared_buffers = '256MB'
work_mem = '4MB'
random_page_cost = 1.1
effective_io_concurrency = 200
max_connections = 100
```

## 🆘 Troubleshooting

### Common Issues

**Connection refused**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -p 5432 -U cybertask_user -d cybertask
```

**Permission denied**
```bash
# Fix script permissions
chmod +x scripts/*.sh

# Check database user privileges
./scripts/setup.sh schema-only
```

**Migration failures**
```bash
# Check migration status
./scripts/migrate.sh status

# Reset and reapply (DEVELOPMENT ONLY)
./scripts/migrate.sh reset
./scripts/migrate.sh migrate
```

### Logs and Debugging

```bash
# PostgreSQL logs location
tail -f /var/log/postgresql/postgresql-*.log

# Enable query logging (temporarily)
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [SQL Performance Tuning Guide](https://wiki.postgresql.org/wiki/Performance_Optimization)

## 🤝 Contributing

1. Follow the existing schema patterns
2. Add appropriate indexes for new queries
3. Update seed data for new features
4. Test migrations thoroughly
5. Document schema changes

## 📝 License

This database schema and scripts are part of the CyberTask project.

---

**Need help?** Check the troubleshooting section or create an issue with detailed error messages and environment information.