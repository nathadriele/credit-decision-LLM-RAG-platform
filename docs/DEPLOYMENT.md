# Deployment Guide - Credit Decision LLM RAG Platform

This guide provides comprehensive instructions for deploying the Credit Decision LLM RAG Platform in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Production Considerations](#production-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **CPU**: Minimum 4 cores, Recommended 8+ cores
- **Memory**: Minimum 8GB RAM, Recommended 16GB+ RAM
- **Storage**: Minimum 50GB, Recommended 100GB+ SSD
- **Network**: Stable internet connection for AI model access

### Software Dependencies

#### For Docker Deployment
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

#### For Kubernetes Deployment
- Kubernetes cluster 1.24+
- kubectl configured
- Helm 3.0+ (optional)
- Docker for building images

### External Services
- OpenAI API key (required for AI features)
- SMTP server (for email notifications)
- SSL certificates (for production)

## Environment Configuration

### 1. Clone the Repository

```bash
git clone https://github.com/nathadriele/credit-decision-llm-rag.git
cd credit-decision-llm-rag
```

### 2. Configure Environment Variables

Copy the appropriate environment file:

```bash
# For development
cp .env.development .env

# For production
cp .env.production .env
```

### 3. Update Required Variables

Edit the `.env` file and update the following critical variables:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_OPENAI_API_KEY

# Required: Secure passwords for production
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars

# Required: Domain configuration for production
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
```

## Docker Deployment

### Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Environment

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Using the Deployment Script

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy development environment
./scripts/deploy.sh development docker deploy

# Deploy production environment
./scripts/deploy.sh production docker deploy

# Check deployment status
./scripts/deploy.sh production docker status

# Clean up deployment
./scripts/deploy.sh production docker cleanup
```

## Kubernetes Deployment

### 1. Prepare the Cluster

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply secrets (update with your actual values first)
kubectl apply -f k8s/secrets.yaml

# Apply configmaps
kubectl apply -f k8s/configmap.yaml
```

### 2. Deploy Infrastructure

```bash
# Deploy persistent volumes
kubectl apply -f k8s/pv.yaml

# Deploy services
kubectl apply -f k8s/services.yaml
```

### 3. Deploy Applications

```bash
# Deploy applications
kubectl apply -f k8s/deployments.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n credit-decision

# Check services
kubectl get services -n credit-decision

# Check ingress
kubectl get ingress -n credit-decision

# View logs
kubectl logs -f deployment/api -n credit-decision
```

### Using the Deployment Script

```bash
# Deploy to Kubernetes
./scripts/deploy.sh production kubernetes deploy

# Check status
./scripts/deploy.sh production kubernetes status
```

## Production Considerations

### 1. SSL/TLS Configuration

Place your SSL certificates in the `ssl/` directory:

```bash
ssl/
├── cert.pem
└── key.pem
```

### 2. Database Security

- Use strong passwords
- Enable SSL connections
- Configure proper firewall rules
- Regular security updates

### 3. API Security

- Configure rate limiting
- Enable CORS properly
- Use secure JWT secrets
- Implement proper authentication

### 4. Network Security

- Use private networks
- Configure firewalls
- Enable DDoS protection
- Implement WAF if needed

### 5. Resource Limits

Configure appropriate resource limits in production:

```yaml
resources:
  limits:
    memory: "2Gi"
    cpu: "1000m"
  requests:
    memory: "1Gi"
    cpu: "500m"
```

## Monitoring and Logging

### Grafana Dashboard

Access Grafana at `http://localhost:3003` (production deployment):

- Username: `admin`
- Password: Set in `GRAFANA_ADMIN_PASSWORD`

### Prometheus Metrics

Access Prometheus at `http://localhost:9090` (production deployment)

### Application Logs

```bash
# Docker
docker-compose logs -f api
docker-compose logs -f web

# Kubernetes
kubectl logs -f deployment/api -n credit-decision
kubectl logs -f deployment/web -n credit-decision
```

### Health Checks

- API Health: `http://localhost:3001/health`
- Web Health: `http://localhost:3000/api/health`
- Database: `docker-compose exec postgres pg_isready`

## Backup and Recovery

### Database Backup

```bash
# Manual backup
docker-compose exec postgres pg_dump -U postgres credit_decision_db > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres credit_decision_db < backup.sql
```

### Automated Backups

The production deployment includes automated backup service:

```bash
# Check backup logs
docker-compose logs backup

# Manual backup trigger
docker-compose exec backup /backup.sh
```

### Vector Database Backup

```bash
# Backup ChromaDB data
docker cp credit-decision-chromadb:/chroma/chroma ./chromadb-backup

# Restore ChromaDB data
docker cp ./chromadb-backup credit-decision-chromadb:/chroma/chroma
```

## Troubleshooting

### Common Issues

#### 1. Services Not Starting

```bash
# Check logs
docker-compose logs

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

#### 2. Database Connection Issues

```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Check connection from API
docker-compose exec api npm run db:test
```

#### 3. Memory Issues

```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
```

#### 4. SSL Certificate Issues

```bash
# Verify certificate
openssl x509 -in ssl/cert.pem -text -noout

# Check certificate expiry
openssl x509 -in ssl/cert.pem -noout -dates
```

### Performance Optimization

#### 1. Database Optimization

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

#### 2. Redis Optimization

```bash
# Check Redis memory usage
docker-compose exec redis redis-cli info memory

# Monitor Redis performance
docker-compose exec redis redis-cli monitor
```

#### 3. Application Optimization

- Enable caching
- Optimize database queries
- Use connection pooling
- Configure proper resource limits

### Getting Help

1. Check the logs first
2. Review the configuration
3. Consult the troubleshooting section
4. Check GitHub issues
5. Contact support team

## Security Checklist

- [ ] Strong passwords configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets properly managed
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Access controls implemented

## Maintenance

### Regular Tasks

1. **Daily**: Check service health and logs
2. **Weekly**: Review metrics and performance
3. **Monthly**: Update dependencies and security patches
4. **Quarterly**: Review and update configurations

### Updates

```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d

# For Kubernetes
kubectl set image deployment/api api=credit-decision-api:new-tag -n credit-decision
```

This deployment guide should help you successfully deploy and maintain the Credit Decision LLM RAG Platform in your environment.
