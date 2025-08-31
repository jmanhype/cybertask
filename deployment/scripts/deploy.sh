#!/bin/bash

# CyberTask Production Deployment Script
set -e

echo "🚀 Starting CyberTask Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check required environment variables
check_env_vars() {
    echo -e "${BLUE}Checking environment variables...${NC}"
    
    required_vars=("DATABASE_URL" "JWT_SECRET" "VITE_API_URL")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}Error: $var is not set${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✓ All required environment variables are set${NC}"
}

# Run tests
run_tests() {
    echo -e "${BLUE}Running tests...${NC}"
    
    # Backend tests
    cd backend
    npm test
    echo -e "${GREEN}✓ Backend tests passed${NC}"
    
    # Frontend tests
    cd ../frontend
    npm test
    echo -e "${GREEN}✓ Frontend tests passed${NC}"
    cd ..
}

# Build applications
build_apps() {
    echo -e "${BLUE}Building applications...${NC}"
    
    # Build backend
    cd backend
    npm run build
    echo -e "${GREEN}✓ Backend built successfully${NC}"
    
    # Build frontend
    cd ../frontend
    npm run build
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
    cd ..
}

# Deploy to production
deploy_to_production() {
    echo -e "${BLUE}Deploying to production...${NC}"
    
    # Push to GitHub (triggers deployments)
    git add .
    git commit -m "Production deployment v1.0.0"
    git tag v1.0.0
    git push origin main
    git push origin v1.0.0
    
    echo -e "${GREEN}✓ Pushed to GitHub, deployments triggered${NC}"
}

# Validate deployment
validate_deployment() {
    echo -e "${BLUE}Validating deployment...${NC}"
    
    # Wait for deployments to complete
    echo "Waiting 60 seconds for deployments to complete..."
    sleep 60
    
    # Check API health
    API_URL="${VITE_API_URL}/health"
    if curl -f -s "$API_URL" > /dev/null; then
        echo -e "${GREEN}✓ API health check passed${NC}"
    else
        echo -e "${RED}✗ API health check failed${NC}"
        exit 1
    fi
    
    # Check frontend
    FRONTEND_URL="https://cybertask.vercel.app"
    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        echo -e "${GREEN}✓ Frontend health check passed${NC}"
    else
        echo -e "${RED}✗ Frontend health check failed${NC}"
        exit 1
    fi
}

# Main deployment flow
main() {
    echo -e "${YELLOW}CyberTask Production Deployment${NC}"
    echo "================================"
    
    check_env_vars
    run_tests
    build_apps
    deploy_to_production
    validate_deployment
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}Frontend:${NC} https://cybertask.vercel.app"
    echo -e "${BLUE}API:${NC} ${VITE_API_URL}"
    echo -e "${BLUE}Version:${NC} v1.0.0"
}

# Run main function
main "$@"