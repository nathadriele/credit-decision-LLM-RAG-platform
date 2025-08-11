# Deployment Guide

This guide covers deploying the Credit Decision LLM RAG Platform across different environments.

## Overview

The platform supports multiple deployment strategies:
- **Local Development**: Docker Compose
- **Staging/Production**: Kubernetes
- **Cloud Providers**: AWS, GCP, Azure
- **Container Orchestration**: Docker Swarm, Kubernetes

## Prerequisites

### Required Tools
- Docker 20.10+
- Docker Compose 2.0+
- kubectl 1.24+
- Node.js 18+
- npm 8+

### Cloud Requirements
- Kubernetes cluster (EKS, GKE, AKS)
- Container registry (ECR, GCR, ACR)
- Load balancer
- Persistent storage
- SSL certificates

## Environment Configuration

### Environment Variables

Create environment-specific files:

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/credit_decision_dev
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret

# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db:5432/credit_decision_staging
REDIS_URL=redis://staging-redis:6379
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret

# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/credit_decision_prod
REDIS_URL=redis://prod-redis:6379
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret
```

### Secrets Management

For production deployments, use proper secrets management:

```bash
# Kubernetes secrets
kubectl create secret generic credit-decision-secrets \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=redis-url="$REDIS_URL" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=openai-api-key="$OPENAI_API_KEY"

# AWS Secrets Manager
aws secretsmanager create-secret \
  --name credit-decision/production \
  --secret-string '{"database_url":"...","jwt_secret":"..."}'
```

## Local Development

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

### Individual Services

```bash
# Start database only
docker-compose up -d postgres redis chromadb

# Start API
cd apps/api
npm run dev

# Start Web (in another terminal)
cd apps/web
npm run dev
```

## Staging Deployment

### Automated Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Check deployment status
kubectl get pods -n credit-decision

# View logs
kubectl logs -f deployment/api -n credit-decision
```

### Manual Deployment

```bash
# Build images
docker build -t your-registry/credit-decision-api:staging apps/api
docker build -t your-registry/credit-decision-web:staging apps/web

# Push images
docker push your-registry/credit-decision-api:staging
docker push your-registry/credit-decision-web:staging

# Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/chromadb.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
kubectl apply -f k8s/ingress.yaml
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Secrets properly managed
- [ ] SSL certificates ready
- [ ] Database backups configured
- [ ] Monitoring setup
- [ ] Alerting configured
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated

### Blue-Green Deployment

```bash
# Deploy to green environment
./scripts/deploy.sh production --environment=green

# Run smoke tests
./scripts/smoke-tests.sh green

# Switch traffic to green
kubectl patch service api-service -p '{"spec":{"selector":{"version":"green"}}}'
kubectl patch service web-service -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for issues
./scripts/monitor.sh

# Rollback if needed
kubectl patch service api-service -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl patch service web-service -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Rolling Deployment

```bash
# Deploy with rolling update
kubectl set image deployment/api api=your-registry/credit-decision-api:v1.2.0
kubectl set image deployment/web web=your-registry/credit-decision-web:v1.2.0

# Monitor rollout
kubectl rollout status deployment/api
kubectl rollout status deployment/web

# Rollback if needed
kubectl rollout undo deployment/api
kubectl rollout undo deployment/web
```

## Cloud Provider Specific

### AWS EKS

```bash
# Create EKS cluster
eksctl create cluster --name credit-decision --region us-east-1

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name credit-decision

# Deploy
./scripts/deploy.sh production
```

### Google GKE

```bash
# Create GKE cluster
gcloud container clusters create credit-decision \
  --zone us-central1-a \
  --num-nodes 3

# Get credentials
gcloud container clusters get-credentials credit-decision --zone us-central1-a

# Deploy
./scripts/deploy.sh production
```

### Azure AKS

```bash
# Create AKS cluster
az aks create \
  --resource-group credit-decision-rg \
  --name credit-decision \
  --node-count 3

# Get credentials
az aks get-credentials --resource-group credit-decision-rg --name credit-decision

# Deploy
./scripts/deploy.sh production
```

## Database Migration

### Automated Migration

```bash
# Run migrations during deployment
kubectl run migration-job \
  --image=your-registry/credit-decision-api:latest \
  --restart=Never \
  --command -- npm run db:migrate
```

### Manual Migration

```bash
# Connect to database pod
kubectl exec -it postgres-0 -- psql -U postgres -d credit_decision

# Run specific migration
kubectl exec -it api-pod -- npm run db:migrate:up 20241201_add_risk_assessment

# Rollback migration
kubectl exec -it api-pod -- npm run db:migrate:down 20241201_add_risk_assessment
```

## Monitoring and Observability

### Health Checks

```bash
# API health
curl https://api.credit-decision.com/api/health

# Web health
curl https://credit-decision.com/api/health

# Database health
kubectl exec postgres-0 -- pg_isready

# Redis health
kubectl exec redis-0 -- redis-cli ping
```

### Metrics and Logs

```bash
# View application logs
kubectl logs -f deployment/api -n credit-decision

# View metrics
kubectl port-forward service/prometheus 9090:9090
# Open http://localhost:9090

# View dashboards
kubectl port-forward service/grafana 3000:3000
# Open http://localhost:3000 (admin/admin)
```

## Scaling

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Manual Scaling

```bash
# Scale API pods
kubectl scale deployment api --replicas=5

# Scale Web pods
kubectl scale deployment web --replicas=3

# Scale database (if using StatefulSet)
kubectl scale statefulset postgres --replicas=3
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
kubectl exec postgres-0 -- pg_dump -U postgres credit_decision > backup.sql

# Restore backup
kubectl exec -i postgres-0 -- psql -U postgres credit_decision < backup.sql
```

### Persistent Volume Backup

```bash
# Create volume snapshot
kubectl create -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
spec:
  source:
    persistentVolumeClaimName: postgres-pvc
EOF
```

## Troubleshooting

### Common Issues

1. **Pod CrashLoopBackOff**
   ```bash
   kubectl describe pod <pod-name>
   kubectl logs <pod-name> --previous
   ```

2. **Service Not Accessible**
   ```bash
   kubectl get endpoints
   kubectl describe service <service-name>
   ```

3. **Database Connection Issues**
   ```bash
   kubectl exec -it api-pod -- npm run db:test-connection
   ```

4. **Image Pull Errors**
   ```bash
   kubectl describe pod <pod-name>
   # Check imagePullSecrets
   ```

### Debug Commands

```bash
# Get all resources
kubectl get all -n credit-decision

# Describe problematic resource
kubectl describe <resource-type> <resource-name>

# Get events
kubectl get events --sort-by=.metadata.creationTimestamp

# Port forward for debugging
kubectl port-forward pod/<pod-name> 3001:3001

# Execute commands in pod
kubectl exec -it <pod-name> -- /bin/sh
```

## Security Considerations

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: web
    ports:
    - protocol: TCP
      port: 3001
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
  containers:
  - name: api
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

## Performance Optimization

### Resource Limits

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Caching Strategy

- Redis for session storage
- Application-level caching
- CDN for static assets
- Database query optimization

## Maintenance

### Regular Tasks

- Update dependencies
- Rotate secrets
- Update SSL certificates
- Database maintenance
- Log rotation
- Backup verification

### Scheduled Maintenance

```bash
# Schedule maintenance window
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets

# Perform maintenance
# ...

# Resume normal operation
kubectl uncordon <node-name>
```
