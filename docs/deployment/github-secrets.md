# GitHub Secrets Configuration

This document outlines all the GitHub Secrets required for the CyberTask CI/CD pipeline to function properly.

## 🔐 Required Secrets

### Core Secrets

| Secret Name | Description | Example/Notes |
|-------------|-------------|---------------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Automatically provided by GitHub |
| `DOCKER_REGISTRY_TOKEN` | Container registry access token | GitHub Container Registry token |

### Database Secrets

| Secret Name | Description | Example/Notes |
|-------------|-------------|---------------|
| `STAGING_DATABASE_URL` | Staging database connection string | `postgresql://user:pass@host:5432/db` |
| `PRODUCTION_DATABASE_URL` | Production database connection string | `postgresql://user:pass@host:5432/db` |
| `POSTGRES_USER` | Database username | `cybertask` |
| `POSTGRES_PASSWORD` | Database password | Strong password |
| `POSTGRES_DB` | Database name | `cybertask` |
| `REDIS_PASSWORD` | Redis password | Strong password |

### Security Secrets

| Secret Name | Description | Example/Notes |
|-------------|-------------|---------------|
| `JWT_SECRET` | JWT signing secret | Minimum 32 characters |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Minimum 32 characters |
| `SESSION_SECRET` | Session secret | Minimum 32 characters |

### Third-Party Service Secrets

| Secret Name | Description | Example/Notes |
|-------------|-------------|---------------|
| `SNYK_TOKEN` | Snyk vulnerability scanning | From Snyk dashboard |
| `CODECOV_TOKEN` | Code coverage reporting | From Codecov dashboard |
| `CYPRESS_RECORD_KEY` | Cypress test recording | From Cypress dashboard |
| `SEMGREP_APP_TOKEN` | Semgrep security scanning | From Semgrep dashboard |

### Cloud Provider Secrets (AWS)

| Secret Name | Description | Example/Notes |
|-------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | AWS access key | For EKS deployment |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | For EKS deployment |
| `AWS_REGION` | AWS region | `us-east-1` |
| `EKS_CLUSTER_NAME` | Staging EKS cluster name | `cybertask-staging` |
| `PROD_EKS_CLUSTER_NAME` | Production EKS cluster name | `cybertask-prod` |

### Notification Secrets

| Secret Name | Description | Example/Notes |
|-------------|-------------|---------------|
| `DEPLOYMENT_WEBHOOK` | Slack/Teams webhook for deployment notifications | Webhook URL |
| `RELEASE_WEBHOOK` | Webhook for release notifications | Webhook URL |
| `MONITORING_WEBHOOK` | Webhook for monitoring alerts | Webhook URL |

### Optional Secrets

| Secret Name | Description | Example/Notes |
|-------------|-------------|---------------|
| `GITLEAKS_LICENSE` | GitLeaks commercial license | Optional |
| `SENTRY_DSN` | Error tracking | Optional |

## 🛠️ How to Set Up Secrets

### 1. Via GitHub Web Interface

1. Go to your repository on GitHub
2. Click on `Settings` tab
3. Navigate to `Secrets and variables` → `Actions`
4. Click `New repository secret`
5. Add the secret name and value
6. Click `Add secret`

### 2. Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# brew install gh

# Login to GitHub
gh auth login

# Set secrets
gh secret set JWT_SECRET --body "your-jwt-secret-here"
gh secret set DATABASE_URL --body "postgresql://user:pass@host:5432/db"

# Set from file
echo "your-secret-value" | gh secret set SECRET_NAME

# Set multiple secrets from .env file
gh secret set -f .env.secrets
```

### 3. Environment-Specific Secrets

For environment-specific secrets, you can create environment secrets:

1. Go to repository `Settings`
2. Navigate to `Environments`
3. Create environments: `staging`, `production`
4. Add environment-specific secrets

## 🔒 Security Best Practices

### Secret Management

1. **Use Strong Passwords**: All passwords should be at least 32 characters long
2. **Rotate Regularly**: Rotate secrets every 3-6 months
3. **Least Privilege**: Only grant necessary permissions
4. **Environment Separation**: Use different secrets for staging and production

### Secret Generation

```bash
# Generate secure random secrets
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Database Connection Strings

```bash
# Staging
postgresql://cybertask_staging:SECURE_PASSWORD@staging-db-host:5432/cybertask_staging

# Production
postgresql://cybertask_prod:SECURE_PASSWORD@prod-db-host:5432/cybertask_prod
```

## 📋 Secret Validation

Create a validation script to check if all required secrets are set:

```bash
#!/bin/bash
# validate-secrets.sh

REQUIRED_SECRETS=(
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "STAGING_DATABASE_URL"
    "PRODUCTION_DATABASE_URL"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
)

echo "🔍 Validating GitHub Secrets..."

for secret in "${REQUIRED_SECRETS[@]}"; do
    if gh secret list | grep -q "$secret"; then
        echo "✅ $secret is set"
    else
        echo "❌ $secret is missing"
    fi
done
```

## 🚨 Emergency Procedures

### Compromised Secrets

1. **Immediately rotate the compromised secret**
2. **Update the GitHub secret**
3. **Redeploy affected environments**
4. **Review access logs**
5. **Update documentation**

### Secret Recovery

If you lose access to secrets:

1. Check your password manager
2. Check environment configuration files (non-committed)
3. Contact team members who may have access
4. As last resort, regenerate secrets and update all systems

## 📖 Documentation

Keep this document updated when:

- Adding new secrets
- Changing secret requirements
- Updating deployment procedures
- Modifying CI/CD workflows

## 🔗 Related Documentation

- [Deployment Guide](./deployment-guide.md)
- [Environment Configuration](./environment-setup.md)
- [Security Policies](../security/security-policies.md)
- [Monitoring Setup](./monitoring-setup.md)