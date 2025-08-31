# CI/CD Pipeline Setup Guide

This guide explains the comprehensive CI/CD pipeline setup for CyberTask using GitHub Actions.

## 🏗️ Pipeline Overview

The CyberTask CI/CD pipeline consists of several workflows:

1. **Continuous Integration (CI)** - `ci.yml`
2. **Staging Deployment (CD)** - `cd-staging.yml`
3. **Production Deployment (CD)** - `cd-production.yml`
4. **Security Scanning** - `security.yml`
5. **Code Quality** - `code-quality.yml`
6. **Release Management** - `release.yml`

## 🔄 Continuous Integration (CI)

### Triggers
- Push to `main`, `develop`, `feature/*` branches
- Pull requests to `main`, `develop` branches

### Features
- **Change Detection**: Optimized execution based on file changes
- **Matrix Testing**: Tests on Node.js 18 and 20
- **Multi-Service**: Separate pipelines for backend and frontend
- **Database Testing**: PostgreSQL and Redis services
- **E2E Testing**: Cypress integration tests
- **Docker Security**: Container vulnerability scanning
- **Quality Gate**: Comprehensive validation before merge

### Workflow Structure
```
CI Pipeline
├── detect-changes (optimized execution)
├── backend-ci (parallel)
│   ├── Dependencies & Build
│   ├── Type Checking & Linting
│   ├── Unit & Integration Tests
│   └── Coverage Reports
├── frontend-ci (parallel)
│   ├── Dependencies & Build
│   ├── Type Checking & Linting
│   ├── Unit Tests
│   └── Coverage Reports
├── e2e-tests
│   ├── Full Stack Testing
│   └── Cypress E2E
├── docker-build
│   ├── Multi-arch Builds
│   └── Security Scanning
└── quality-gate
    └── Final Validation
```

## 🚀 Staging Deployment

### Triggers
- Push to `main` branch (automatic)
- Manual dispatch with options

### Features
- **Docker Registry**: GitHub Container Registry (GHCR)
- **Multi-arch Builds**: AMD64 and ARM64
- **Kubernetes Deployment**: EKS integration
- **Database Migration**: Automated schema updates
- **Smoke Tests**: Post-deployment validation
- **Performance Testing**: K6 load testing
- **Security Scanning**: OWASP ZAP integration

### Deployment Flow
```
Staging Deployment
├── build-and-push
│   ├── Multi-stage Docker builds
│   ├── SBOM generation
│   └── Multi-arch support
├── deploy-staging
│   ├── Kubernetes deployment
│   ├── Rolling updates
│   └── Health checks
├── migrate-staging
│   ├── Database migrations
│   └── Seed data
├── performance-test
│   └── K6 load testing
└── security-scan
    └── OWASP ZAP scan
```

## 🎯 Production Deployment

### Triggers
- Manual dispatch only
- Version-based deployment

### Features
- **Manual Approval**: Environment protection
- **Version Validation**: Git tag verification
- **Blue-Green Deployment**: Zero-downtime updates
- **Automatic Rollback**: On health check failure
- **Database Backup**: Pre-migration safety
- **Enhanced Monitoring**: 24-hour alert period

### Deployment Flow
```
Production Deployment
├── pre-deployment-checks
│   ├── Version validation
│   └── Staging verification
├── create-deployment
│   └── GitHub deployment record
├── build-production
│   ├── Production images
│   └── Security scanning
├── deploy-production (manual approval)
│   ├── Backup current state
│   ├── Rolling deployment
│   ├── Health checks
│   └── Rollback on failure
├── migrate-production
│   ├── Database backup
│   └── Schema updates
└── post-deployment-monitoring
    ├── Enhanced monitoring
    ├── Release notes
    └── Team notifications
```

## 🛡️ Security Pipeline

### Triggers
- Push/PR events
- Daily scheduled scans
- Manual dispatch

### Security Checks
- **Dependency Scanning**: npm audit + Snyk
- **Code Analysis**: CodeQL + Semgrep
- **Secret Detection**: TruffleHog + GitLeaks
- **Container Security**: Trivy + Anchore Grype
- **License Compliance**: License checker
- **SAST**: Static application security testing

### Security Flow
```
Security Pipeline
├── dependency-scan (npm audit, Snyk)
├── codeql-analysis (static analysis)
├── secrets-scan (TruffleHog, GitLeaks)
├── container-scan (Trivy, Anchore)
├── sast-scan (Semgrep, ESLint security)
├── license-check (compliance)
└── security-summary
    ├── Report generation
    └── Issue creation
```

## 🎨 Code Quality Pipeline

### Quality Checks
- **Linting**: ESLint with strict rules
- **Formatting**: Prettier checks
- **Type Safety**: TypeScript strict mode
- **Complexity Analysis**: Code complexity metrics
- **Dependency Analysis**: Bundle size and outdated packages
- **Auto-fixing**: Automated code improvements (PRs only)

### Quality Flow
```
Code Quality Pipeline
├── lint-and-format
├── typescript-strict
├── complexity-analysis
├── dependency-analysis
├── auto-fix (PRs only)
└── quality-gate
    └── Scoring and recommendations
```

## 📦 Release Management

### Release Types
- **Stable Release**: Production-ready versions
- **Pre-release**: Alpha/beta versions
- **Hotfix**: Critical bug fixes

### Release Flow
```
Release Pipeline
├── validate-release
│   └── Version format validation
├── build-release
│   └── Release artifacts
├── build-docker-images
│   ├── Multi-arch builds
│   └── SBOM generation
├── generate-changelog
│   └── Automated release notes
├── security-scan
│   └── Final security validation
├── create-release
│   ├── GitHub release
│   └── Asset upload
└── post-release
    ├── Team notifications
    ├── Documentation updates
    └── Next milestone creation
```

## 📊 Monitoring and Observability

### Built-in Monitoring
- **Health Checks**: Application health endpoints
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Automated error detection
- **Security Alerts**: Vulnerability notifications
- **Deployment Status**: Real-time deployment tracking

### Integration Points
- **Codecov**: Test coverage tracking
- **Sentry**: Error monitoring (optional)
- **Prometheus**: Metrics collection (optional)
- **Slack/Teams**: Notification webhooks

## ⚙️ Configuration

### Environment Variables
```bash
# Required in GitHub Secrets
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SNYK_TOKEN=your-snyk-token
```

### Branch Protection Rules
```yaml
Required status checks:
  - ci/quality-gate
  - security/dependency-scan
  - security/codeql-analysis

Require pull request reviews: true
Dismiss stale reviews: true
Require review from CODEOWNERS: true
Restrict pushes to matching branches: true
```

### Environment Protection
```yaml
staging:
  required_reviewers: []
  wait_timer: 0

production:
  required_reviewers: ["@cybertask/maintainers"]
  wait_timer: 5 # minutes
```

## 🚨 Troubleshooting

### Common Issues

**CI Pipeline Failures**
```bash
# Check test failures
npm test -- --verbose

# Check linting issues
npm run lint

# Check type errors
npm run typecheck
```

**Deployment Failures**
```bash
# Check Kubernetes logs
kubectl logs deployment/cybertask-backend -n cybertask-staging

# Check service status
kubectl get pods -n cybertask-staging

# Rollback deployment
kubectl rollout undo deployment/cybertask-backend -n cybertask-staging
```

**Security Scan Failures**
```bash
# Check vulnerability details
npm audit --audit-level=high

# Update dependencies
npm update

# Check container vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image cybertask-backend:latest
```

### Pipeline Debug
- Check GitHub Actions logs
- Review secret configurations
- Validate environment variables
- Test Docker builds locally

## 🔗 Related Documentation

- [GitHub Secrets Configuration](./github-secrets.md)
- [Environment Setup](./environment-setup.md)
- [Security Policies](../security/security-policies.md)
- [Monitoring Setup](./monitoring-setup.md)
- [Docker Guide](./docker-guide.md)

## 📈 Metrics and KPIs

### Pipeline Metrics
- **Build Time**: Average CI/CD execution time
- **Success Rate**: Percentage of successful deployments
- **Test Coverage**: Code coverage percentage
- **Security Score**: Vulnerability assessment score
- **Quality Score**: Code quality metrics

### Performance Targets
- CI Pipeline: < 15 minutes
- Staging Deployment: < 10 minutes
- Production Deployment: < 20 minutes
- Test Coverage: > 80%
- Security Score: > 90%