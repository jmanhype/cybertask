-- CyberTask Database Initialization
-- This file is executed when the PostgreSQL container starts

-- Create database if not exists (handled by Docker environment variables)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cybertask TO cybertask;