-- CyberTask Database Schema
-- PostgreSQL 14+ with UUID, JSONB, and Full Text Search
-- Created: 2025-08-30

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ================================
-- USERS AND AUTHENTICATION
-- ================================

-- Users table with comprehensive profile data
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    theme VARCHAR(20) DEFAULT 'light',
    email_verified BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full text search
    search_vector TSVECTOR
);

-- Indexes for users
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_active ON users (active);
CREATE INDEX idx_users_search ON users USING gin(search_vector);
CREATE INDEX idx_users_created_at ON users (created_at);

-- User roles and permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, role_id)
);

-- OAuth providers
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'microsoft'
    provider_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider, provider_id),
    UNIQUE(user_id, provider)
);

-- ================================
-- ORGANIZATIONS AND TEAMS
-- ================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    website_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id)
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id)
);

-- ================================
-- PROJECTS
-- ================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'completed'
    priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    start_date DATE,
    end_date DATE,
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full text search
    search_vector TSVECTOR
);

-- Indexes for projects
CREATE INDEX idx_projects_organization ON projects (organization_id);
CREATE INDEX idx_projects_team ON projects (team_id);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_search ON projects USING gin(search_vector);

-- ================================
-- TASKS
-- ================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done', 'blocked'
    priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    difficulty_score INTEGER CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
    story_points INTEGER,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Dates
    due_date TIMESTAMP WITH TIME ZONE,
    start_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Time tracking
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Labels and categories
    labels TEXT[] DEFAULT '{}',
    category VARCHAR(100),
    
    -- AI-enhanced fields
    ai_priority_score DECIMAL(3,2), -- AI-calculated priority (0-1)
    ai_complexity_score DECIMAL(3,2), -- AI-calculated complexity (0-1)
    ai_insights JSONB DEFAULT '{}',
    
    -- Custom fields
    custom_fields JSONB DEFAULT '{}',
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full text search
    search_vector TSVECTOR
);

-- Indexes for tasks
CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_priority ON tasks (priority);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);
CREATE INDEX idx_tasks_parent ON tasks (parent_task_id);
CREATE INDEX idx_tasks_search ON tasks USING gin(search_vector);
CREATE INDEX idx_tasks_labels ON tasks USING gin(labels);
CREATE INDEX idx_tasks_created_at ON tasks (created_at);

-- Task dependencies
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'blocks', -- 'blocks', 'relates_to', 'duplicates'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(task_id, depends_on_task_id),
    CHECK(task_id != depends_on_task_id) -- Prevent self-dependencies
);

-- Task comments and activity
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'comment', -- 'comment', 'status_change', 'assignment'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments (task_id);
CREATE INDEX idx_task_comments_user ON task_comments (user_id);

-- ================================
-- ATTACHMENTS AND FILES
-- ================================

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK ((task_id IS NOT NULL) OR (project_id IS NOT NULL))
);

-- ================================
-- TIME TRACKING
-- ================================

CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
    date DATE NOT NULL,
    billable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_time_entries_task ON time_entries (task_id);
CREATE INDEX idx_time_entries_user ON time_entries (user_id);
CREATE INDEX idx_time_entries_date ON time_entries (date);

-- ================================
-- NOTIFICATIONS
-- ================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- For grouping related notifications
    group_key VARCHAR(255)
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_read ON notifications (read);
CREATE INDEX idx_notifications_group ON notifications (group_key);

-- ================================
-- ANALYTICS AND METRICS
-- ================================

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'project', 'user'
    entity_id UUID,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'completed'
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partitioned by month for performance
CREATE INDEX idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_organization ON activity_logs (organization_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs (created_at);

-- ================================
-- AI AND CLAUDE FLOW INTEGRATION
-- ================================

CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'project', 'workflow'
    entity_id UUID NOT NULL,
    analysis_type VARCHAR(50) NOT NULL, -- 'priority', 'complexity', 'optimization'
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    model_version VARCHAR(50),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_analyses_entity ON ai_analyses (entity_type, entity_id);
CREATE INDEX idx_ai_analyses_type ON ai_analyses (analysis_type);

-- Claude Flow workflows
CREATE TABLE claude_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_config JSONB NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- SEARCH AND INDEXING FUNCTIONS
-- ================================

-- Update search vectors for users
CREATE OR REPLACE FUNCTION update_user_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_search_vector
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_user_search_vector();

-- Update search vectors for projects
CREATE OR REPLACE FUNCTION update_project_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_search_vector
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_project_search_vector();

-- Update search vectors for tasks
CREATE OR REPLACE FUNCTION update_task_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.labels, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_search_vector
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_task_search_vector();

-- ================================
-- INITIAL DATA AND ROLES
-- ================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System administrator with full access', '["all"]'),
('org_owner', 'Organization owner with full org access', '["org.manage", "projects.manage", "teams.manage", "users.manage"]'),
('org_admin', 'Organization administrator', '["projects.manage", "teams.manage", "users.view"]'),
('project_manager', 'Project manager', '["projects.manage", "tasks.manage", "teams.view"]'),
('developer', 'Developer with task management access', '["tasks.manage", "projects.view", "time.track"]'),
('viewer', 'Read-only access', '["projects.view", "tasks.view"]');

-- ================================
-- PERFORMANCE OPTIMIZATION
-- ================================

-- Materialized view for dashboard metrics
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
    p.organization_id,
    p.id as project_id,
    p.name as project_name,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.due_date < NOW() AND t.status != 'done' THEN 1 END) as overdue_tasks,
    AVG(t.ai_priority_score) as avg_priority_score,
    SUM(t.actual_hours) as total_hours_logged
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
WHERE p.status = 'active'
GROUP BY p.organization_id, p.id, p.name;

-- Refresh materialized view every hour
CREATE INDEX idx_dashboard_metrics_org ON dashboard_metrics (organization_id);

-- ================================
-- CONSTRAINTS AND VALIDATION
-- ================================

-- Ensure task hierarchy doesn't create cycles
CREATE OR REPLACE FUNCTION check_task_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    cycle_check UUID[];
    current_task UUID;
BEGIN
    -- Start with the parent task
    current_task := NEW.parent_task_id;
    cycle_check := ARRAY[NEW.id];
    
    -- Traverse up the hierarchy
    WHILE current_task IS NOT NULL LOOP
        -- Check if we've seen this task before (cycle detected)
        IF current_task = ANY(cycle_check) THEN
            RAISE EXCEPTION 'Task hierarchy cycle detected';
        END IF;
        
        -- Add to our cycle check array
        cycle_check := array_append(cycle_check, current_task);
        
        -- Move to the next parent
        SELECT parent_task_id INTO current_task 
        FROM tasks 
        WHERE id = current_task;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_task_hierarchy
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW 
    WHEN (NEW.parent_task_id IS NOT NULL)
    EXECUTE FUNCTION check_task_hierarchy();

-- ================================
-- CLEANUP AND MAINTENANCE
-- ================================

-- Auto-archive old activity logs (older than 1 year)
CREATE OR REPLACE FUNCTION archive_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM activity_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('archive-logs', '0 2 * * 0', 'SELECT archive_old_activity_logs();');

-- ================================
-- SECURITY POLICIES (RLS)
-- ================================

-- Enable Row Level Security on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_own_data ON users
    FOR ALL 
    USING (id = current_setting('app.current_user_id')::UUID);

-- Organization members can see organization data
CREATE POLICY org_member_access ON organizations
    FOR ALL
    USING (id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = current_setting('app.current_user_id')::UUID
    ));

-- Project access based on organization membership
CREATE POLICY project_org_access ON projects
    FOR ALL
    USING (organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = current_setting('app.current_user_id')::UUID
    ));

-- Task access based on project access
CREATE POLICY task_project_access ON tasks
    FOR ALL
    USING (project_id IN (
        SELECT p.id 
        FROM projects p
        JOIN organization_members om ON om.organization_id = p.organization_id
        WHERE om.user_id = current_setting('app.current_user_id')::UUID
    ));

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cybertask_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cybertask_app;

-- Performance monitoring view
CREATE VIEW performance_metrics AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- End of schema