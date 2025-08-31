# CyberTask Deployment Architecture

## Deployment Overview
CyberTask is designed as a cloud-native application with Kubernetes orchestration, supporting multi-region deployment, auto-scaling, and zero-downtime deployments. The architecture supports both on-premises and cloud deployments.

## Container Architecture

### Multi-Stage Docker Builds

#### Backend Service Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cybertask -u 1001

# Copy built application
COPY --from=builder --chown=cybertask:nodejs /app/dist ./dist
COPY --from=builder --chown=cybertask:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=cybertask:nodejs /app/package*.json ./

# Security hardening
RUN apk add --no-cache dumb-init
RUN rm -rf /var/cache/apk/*

# Switch to non-root user
USER cybertask

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

#### Frontend Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build for production
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Security headers
COPY security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Create non-root user
RUN adduser -D -s /bin/sh cybertask
RUN chown -R cybertask:cybertask /usr/share/nginx/html
RUN chown -R cybertask:cybertask /var/cache/nginx

# Switch to non-root user
USER cybertask

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Container Security Configuration
```yaml
# Security contexts for containers
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: cybertask-api
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
      runAsNonRoot: true
      runAsUser: 1001
    resources:
      requests:
        memory: "512Mi"
        cpu: "200m"
      limits:
        memory: "1Gi"
        cpu: "500m"
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

## Kubernetes Configuration

### Namespace and Resource Quotas
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cybertask
  labels:
    name: cybertask
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cybertask-quota
  namespace: cybertask
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
    persistentvolumeclaims: "10"
    services: "20"
    secrets: "20"
    configmaps: "20"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: cybertask-limits
  namespace: cybertask
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "1Gi"
    defaultRequest:
      cpu: "100m"
      memory: "256Mi"
    type: Container
```

### Service Deployments

#### API Gateway Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: cybertask
  labels:
    app: api-gateway
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1
    spec:
      serviceAccountName: cybertask-api-gateway
      containers:
      - name: api-gateway
        image: cybertask/api-gateway:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cybertask-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: cybertask-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: cybertask
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

#### Microservice Template
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.service.name }}
  namespace: cybertask
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Values.service.name }}
  template:
    metadata:
      labels:
        app: {{ .Values.service.name }}
        version: {{ .Values.image.tag }}
    spec:
      containers:
      - name: {{ .Values.service.name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: {{ .Values.service.port }}
        env:
        - name: SERVICE_NAME
          value: {{ .Values.service.name }}
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: {{ .Values.service.name }}-secrets
              key: database-url
        envFrom:
        - configMapRef:
            name: {{ .Values.service.name }}-config
        - secretRef:
            name: {{ .Values.service.name }}-secrets
        resources:
          requests:
            memory: {{ .Values.resources.requests.memory }}
            cpu: {{ .Values.resources.requests.cpu }}
          limits:
            memory: {{ .Values.resources.limits.memory }}
            cpu: {{ .Values.resources.limits.cpu }}
        volumeMounts:
        - name: app-config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: app-config
        configMap:
          name: {{ .Values.service.name }}-config
```

## Database Deployment

### PostgreSQL Cluster Configuration
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgresql-cluster
  namespace: cybertask
spec:
  instances: 3
  
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      maintenance_work_mem: "64MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      work_mem: "4MB"
      min_wal_size: "1GB"
      max_wal_size: "4GB"
      
  bootstrap:
    initdb:
      database: cybertask
      owner: cybertask
      secret:
        name: postgresql-credentials
  
  storage:
    size: 100Gi
    storageClass: fast-ssd
  
  resources:
    requests:
      memory: "2Gi"
      cpu: "500m"
    limits:
      memory: "4Gi"
      cpu: "2"
  
  monitoring:
    enabled: true
    
  backup:
    target: prefer-standby
    retentionPolicy: "30d"
    data:
      compression: gzip
      encryption: AES256
    wal:
      compression: gzip
      encryption: AES256
---
apiVersion: v1
kind: Secret
metadata:
  name: postgresql-credentials
  namespace: cybertask
type: kubernetes.io/basic-auth
data:
  username: Y3liZXJ0YXNr  # cybertask (base64)
  password: <base64-encoded-password>
```

### Redis Cluster
```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: cybertask
spec:
  clusterSize: 6
  clusterVersion: v7
  
  redisExporter:
    enabled: true
    image: quay.io/opstree/redis-exporter:v1.44.0
  
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
        storageClassName: fast-ssd
  
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  
  securityContext:
    runAsUser: 1000
    fsGroup: 1000
```

## Auto-Scaling Configuration

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: cybertask
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      selectPolicy: Min
```

### Vertical Pod Autoscaler
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: task-service-vpa
  namespace: cybertask
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: task-service
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
```

## Service Mesh (Istio)

### Istio Configuration
```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: cybertask-istio
spec:
  values:
    global:
      meshID: cybertask-mesh
      network: cybertask-network
    pilot:
      env:
        EXTERNAL_ISTIOD: false
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: LoadBalancer
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### Gateway and Virtual Service
```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cybertask-gateway
  namespace: cybertask
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: cybertask-tls-cert
    hosts:
    - api.cybertask.com
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - api.cybertask.com
    tls:
      httpsRedirect: true
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cybertask-vs
  namespace: cybertask
spec:
  hosts:
  - api.cybertask.com
  gateways:
  - cybertask-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1/auth
    route:
    - destination:
        host: user-service
        port:
          number: 80
    fault:
      delay:
        percentage:
          value: 0.1
        fixedDelay: 5s
  - match:
    - uri:
        prefix: /api/v1/tasks
    route:
    - destination:
        host: task-service
        port:
          number: 80
    retries:
      attempts: 3
      perTryTimeout: 30s
  - match:
    - uri:
        prefix: /api/v1/projects
    route:
    - destination:
        host: project-service
        port:
          number: 80
```

### Traffic Policies
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: task-service-dr
  namespace: cybertask
spec:
  host: task-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        maxRequestsPerConnection: 2
    loadBalancer:
      simple: LEAST_CONN
    circuitBreaker:
      consecutiveErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Monitoring and Observability

### Prometheus Configuration
```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: cybertask-prometheus
  namespace: monitoring
spec:
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      app: cybertask
  ruleSelector:
    matchLabels:
      prometheus: cybertask-prometheus
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
    limits:
      memory: 4Gi
      cpu: 1000m
  retention: 30d
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd
  additionalScrapeConfigs:
    name: additional-scrape-configs
    key: prometheus-additional.yaml
```

### Grafana Dashboard Configuration
```yaml
apiVersion: integreatly.org/v1alpha1
kind: GrafanaDashboard
metadata:
  name: cybertask-overview
  namespace: monitoring
  labels:
    app: grafana
spec:
  json: |
    {
      "dashboard": {
        "id": null,
        "title": "CyberTask Overview",
        "tags": ["cybertask"],
        "panels": [
          {
            "id": 1,
            "title": "Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(http_requests_total[5m]))",
                "legendFormat": "RPS"
              }
            ]
          },
          {
            "id": 2,
            "title": "Response Time",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
                "legendFormat": "95th percentile"
              }
            ]
          },
          {
            "id": 3,
            "title": "Error Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))",
                "legendFormat": "Error Rate"
              }
            ]
          }
        ]
      }
    }
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Run security scan
      run: npm audit --audit-level=high
    
    - name: SonarCloud Scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker images
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: cybertask
        IMAGE_TAG: ${{ github.sha }}
      run: |
        # Build all service images
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY-api:$IMAGE_TAG ./services/api
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$IMAGE_TAG ./frontend
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY-worker:$IMAGE_TAG ./services/worker
        
        # Push images
        docker push $ECR_REGISTRY/$ECR_REPOSITORY-api:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY-worker:$IMAGE_TAG
    
    - name: Update Kubernetes manifests
      run: |
        # Update image tags in Kubernetes manifests
        sed -i "s/IMAGE_TAG/${{ github.sha }}/g" k8s/*.yaml
    
    - name: Deploy to staging
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/staging/
        images: |
          $ECR_REGISTRY/$ECR_REPOSITORY-api:${{ github.sha }}
          $ECR_REGISTRY/$ECR_REPOSITORY-frontend:${{ github.sha }}
          $ECR_REGISTRY/$ECR_REPOSITORY-worker:${{ github.sha }}

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production with ArgoCD
      run: |
        # Update ArgoCD application
        curl -X PATCH \
          -H "Authorization: Bearer ${{ secrets.ARGOCD_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{
            "spec": {
              "source": {
                "targetRevision": "${{ github.sha }}"
              }
            }
          }' \
          https://argocd.cybertask.com/api/v1/applications/cybertask-production
```

### ArgoCD Application Configuration
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cybertask-production
  namespace: argocd
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  project: cybertask
  source:
    repoURL: https://github.com/cybertask/cybertask-infra
    targetRevision: HEAD
    path: k8s/production
    helm:
      valueFiles:
      - values.yaml
      - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: cybertask
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  revisionHistoryLimit: 10
```

## Multi-Region Deployment

### Region Configuration
```yaml
# Primary region (us-west-2)
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
  namespace: cybertask
data:
  REGION: "us-west-2"
  DATABASE_READ_REPLICA: "cybertask-db-replica-us-west-2.amazonaws.com"
  CDN_ENDPOINT: "https://cdn-west.cybertask.com"
  BACKUP_REGION: "us-east-1"
---
# Secondary region (us-east-1)
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
  namespace: cybertask
data:
  REGION: "us-east-1"
  DATABASE_READ_REPLICA: "cybertask-db-replica-us-east-1.amazonaws.com"
  CDN_ENDPOINT: "https://cdn-east.cybertask.com"
  BACKUP_REGION: "us-west-2"
```

### Cross-Region Database Replication
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgresql-replica
  namespace: cybertask
spec:
  instances: 2
  
  bootstrap:
    pg_basebackup:
      source: primary-cluster
  
  externalClusters:
  - name: primary-cluster
    connectionParameters:
      host: primary-postgres.us-west-2.rds.amazonaws.com
      user: postgres
      dbname: cybertask
      sslmode: require
    password:
      name: primary-cluster-credentials
      key: password
  
  storage:
    size: 100Gi
    storageClass: fast-ssd
  
  resources:
    requests:
      memory: "2Gi"
      cpu: "500m"
    limits:
      memory: "4Gi"
      cpu: "2"
```

## Backup and Disaster Recovery

### Backup Configuration
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: cybertask
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:14
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgresql-cluster-rw \
                      -U cybertask \
                      -d cybertask \
                      --verbose \
                      --no-password \
                      --format=custom \
                      --compress=9 \
                      --file=/tmp/backup.sql
              
              # Upload to S3
              aws s3 cp /tmp/backup.sql \
                s3://cybertask-backups/database/$(date +%Y-%m-%d)/backup.sql
              
              # Keep only last 30 days
              aws s3api list-objects-v2 \
                --bucket cybertask-backups \
                --prefix database/ \
                --query 'Contents[?LastModified<`'$(date -d '30 days ago' --iso-8601)'`].[Key]' \
                --output text | xargs -I {} aws s3 rm s3://cybertask-backups/{}
          restartPolicy: OnFailure
```

### Disaster Recovery Procedure
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: disaster-recovery-runbook
  namespace: cybertask
data:
  procedure.md: |
    # Disaster Recovery Procedure
    
    ## RTO: 4 hours | RPO: 1 hour
    
    ### Step 1: Assess Damage
    - Check cluster health: `kubectl get nodes`
    - Check service status: `kubectl get pods -n cybertask`
    - Check database status: `kubectl get clusters.postgresql.cnpg.io`
    
    ### Step 2: Failover to Secondary Region
    - Update DNS to point to secondary region
    - Scale up secondary region services
    - Promote read replica to primary
    
    ### Step 3: Data Recovery
    - Restore from latest backup if needed
    - Verify data integrity
    - Resume normal operations
    
    ### Step 4: Post-Incident
    - Update monitoring and alerting
    - Document lessons learned
    - Plan primary region restoration
```

## Security Hardening

### Pod Security Standards
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cybertask
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cybertask-network-policy
  namespace: cybertask
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: istio-system
    - namespaceSelector:
        matchLabels:
          name: cybertask
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: cybertask
  - to: []
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
    - protocol: TCP
      port: 443   # HTTPS outbound
    - protocol: TCP
      port: 53    # DNS
    - protocol: UDP
      port: 53    # DNS
```

This deployment architecture provides a comprehensive, production-ready foundation for CyberTask with high availability, scalability, security, and operational excellence.