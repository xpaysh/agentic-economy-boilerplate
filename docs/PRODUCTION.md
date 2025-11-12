# Production Deployment Guide

Deploy agentic payment vending machines to production safely and reliably.

## Pre-Deployment Checklist

### Security
- [ ] Environment variables secured (not in codebase)
- [ ] HTTPS/TLS enabled
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Error messages don't leak sensitive info
- [ ] Redis password set
- [ ] API keys rotated from development
- [ ] CORS configured for specific origins
- [ ] Security headers enabled (Helmet)

### Configuration
- [ ] `USE_REDIS=true` in production
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=warn` or `error`
- [ ] Real API credentials configured
- [ ] Payment webhook URLs updated
- [ ] Monitoring/alerting setup

### Testing
- [ ] All tests passing
- [ ] Load tested
- [ ] Security tested
- [ ] Payment flows verified
- [ ] Error handling tested

## Migration from In-Memory to Redis

### Why Redis in Production?

**In-Memory Issues:**
- ❌ Data lost on restart
- ❌ No sharing between instances
- ❌ Limited by single server RAM
- ❌ No persistence

**Redis Benefits:**
- ✅ Data persistence across restarts
- ✅ Shared state between instances
- ✅ Horizontal scaling support
- ✅ Backup and replication

### Step-by-Step Migration

#### 1. Setup Redis

```bash
# Install Redis
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine

# Start Redis
redis-server
```

#### 2. Configure Connection

```env
# .env
USE_REDIS=true
REDIS_URL=redis://localhost:6379

# For Redis with password
REDIS_URL=redis://:yourpassword@localhost:6379

# For Redis cluster
REDIS_URL=redis://redis-cluster:6379
```

#### 3. Test Connection

```javascript
const { createStorage } = require('./shared/storage');

async function testRedis() {
  const storage = createStorage({ useRedis: true });
  await storage.initialize();

  // Test write
  await storage.set('test-key', 'test-value', 60);

  // Test read
  const value = await storage.get('test-key');
  console.log('Redis test:', value === 'test-value' ? '✓ Success' : '✗ Failed');

  await storage.close();
}

testRedis();
```

#### 4. Gradual Rollout

**Option A: Blue-Green Deployment**
1. Keep old version running (in-memory)
2. Deploy new version with Redis
3. Test new version
4. Switch traffic
5. Shut down old version

**Option B: Canary Deployment**
1. Deploy to 10% of traffic
2. Monitor for issues
3. Gradually increase to 100%

#### 5. Data Backup

```bash
# Manual backup
redis-cli SAVE

# Scheduled backups (cron)
0 * * * * redis-cli SAVE
```

### Rollback Plan

If issues occur:

```env
# Quickly switch back to in-memory
USE_REDIS=false
```

Then restart the service.

## Docker Production Deployment

### Build Production Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build x402-vending

# Build with no cache (clean build)
docker-compose build --no-cache
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - backend

  x402-vending:
    build: ./x402-vending-machine
    environment:
      - NODE_ENV=production
      - USE_REDIS=true
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - LOG_LEVEL=warn
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - backend
      - frontend

volumes:
  redis-data:

networks:
  backend:
    internal: true
  frontend:
```

### Deploy

```bash
# Set environment variables
export REDIS_PASSWORD=your-secure-password
export STRIPE_SECRET_KEY=sk_live_...
export MASTERCARD_API_KEY=prod_key_...

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
curl https://your-domain.com/health
```

## Cloud Platforms

### AWS ECS/Fargate

**1. Create Task Definition:**

```json
{
  "family": "x402-vending-machine",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "x402-vending",
      "image": "your-ecr-repo/x402-vending:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "USE_REDIS", "value": "true"}
      ],
      "secrets": [
        {"name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/x402-vending",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**2. Deploy with ECS:**

```bash
# Push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com

docker tag x402-vending:latest <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/x402-vending:latest
docker push <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/x402-vending:latest

# Create/update service
aws ecs update-service --cluster prod-cluster --service x402-vending --force-new-deployment
```

**3. Use AWS ElastiCache for Redis:**

```env
REDIS_URL=redis://prod-redis.xxxxx.cache.amazonaws.com:6379
```

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/x402-vending

# Deploy
gcloud run deploy x402-vending \
  --image gcr.io/PROJECT_ID/x402-vending \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,USE_REDIS=true \
  --set-secrets REDIS_URL=redis-url:latest

# Connect to Cloud Memorystore (Redis)
gcloud redis instances create prod-redis \
  --size=1 \
  --region=us-central1
```

### Vercel/Railway

**Railway:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Link to project
railway link

# Add Redis
railway add

# Deploy
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set USE_REDIS=true
```

**Vercel:**
- Vercel is better for serverless/frontend
- For vending machines, use Vercel + external Redis (Upstash)

## Scaling

### Horizontal Scaling

```bash
# Docker Compose
docker-compose up -d --scale x402-vending=3

# Kubernetes
kubectl scale deployment x402-vending --replicas=3
```

### Load Balancer Setup

**Nginx:**

```nginx
upstream x402_backend {
    least_conn;
    server x402-1:3000;
    server x402-2:3000;
    server x402-3:3000;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://x402_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Auto-Scaling

**AWS ECS:**

```json
{
  "targetTrackingScalingPolicyConfiguration": {
    "targetValue": 70.0,
    "predefinedMetricSpecification": {
      "predefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "scaleOutCooldown": 60,
    "scaleInCooldown": 60
  }
}
```

## Monitoring

### Health Checks

```javascript
// Enhanced health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: 'unknown',
    memory: process.memoryUsage()
  };

  // Check Redis
  try {
    await storage.set('health-check', '1', 10);
    health.redis = 'connected';
  } catch (error) {
    health.redis = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Application Monitoring

**DataDog:**

```javascript
const StatsD = require('node-statsd');
const client = new StatsD();

// Track payments
client.increment('payments.initiated');
client.increment('payments.completed');
client.timing('payment.duration', duration);
```

**New Relic:**

```javascript
const newrelic = require('newrelic');

// Custom metrics
newrelic.recordMetric('Custom/Payments/Total', paymentCount);
newrelic.recordMetric('Custom/Payments/Revenue', totalRevenue);
```

**Prometheus:**

```javascript
const prometheus = require('prom-client');

const paymentCounter = new prometheus.Counter({
  name: 'payments_total',
  help: 'Total number of payments',
  labelNames: ['status', 'protocol']
});

paymentCounter.inc({ status: 'completed', protocol: 'x402' });
```

### Log Aggregation

**Winston + CloudWatch:**

```javascript
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logger = winston.createLogger({
  transports: [
    new CloudWatchTransport({
      logGroupName: '/aws/ecs/x402-vending',
      logStreamName: 'production',
      awsRegion: 'us-east-1'
    })
  ]
});
```

## Security Hardening

### HTTPS/TLS

```nginx
# Nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;

# Add HSTS header
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Rate Limiting (Advanced)

```javascript
// Redis-backed rate limiting
const { createRedisRateLimiter } = require('./shared/middleware/rate-limiter');

const limiter = createRedisRateLimiter(redisClient, {
  windowMs: 60000,
  max: 100
});

app.use('/api/payments', limiter);
```

### Secrets Management

**AWS Secrets Manager:**

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

const apiKeys = await getSecret('prod/api-keys');
```

**Environment Variables Only:**

```bash
# Never commit these!
export STRIPE_SECRET_KEY=sk_live_...
export REDIS_PASSWORD=...
export JWT_SECRET=...
```

## Backup and Disaster Recovery

### Redis Backups

```bash
# Automated backups
redis-cli CONFIG SET save "900 1 300 10 60 10000"

# Manual snapshot
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d).rdb
```

### Application State

```javascript
// Export payment history
app.get('/admin/export', requireAuth, async (req, res) => {
  const payments = await storage.keys('payment:*');
  const data = [];

  for (const key of payments) {
    const payment = await storage.get(key);
    data.push(payment);
  }

  res.json(data);
});
```

### Disaster Recovery Plan

1. **Detect**: Monitoring alerts fire
2. **Assess**: Check health endpoints
3. **Rollback**: Deploy previous version
4. **Restore**: Load Redis backup
5. **Verify**: Test critical flows
6. **Communicate**: Update status page

## Performance Optimization

### Caching

```javascript
// Cache product catalog
const CACHE_TTL = 3600; // 1 hour

app.get('/api/products', async (req, res) => {
  let products = await cache.get('products');

  if (!products) {
    products = await loadProducts();
    await cache.set('products', products, CACHE_TTL);
  }

  res.json(products);
});
```

### Connection Pooling

```javascript
// Redis connection pool
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    keepAlive: 5000
  },
  // Connection pool size
  maxRetriesPerRequest: 3
});
```

### Database Indexing

```javascript
// If using MongoDB/PostgreSQL alongside Redis
await db.collection('payments').createIndex({ agentId: 1, createdAt: -1 });
await db.collection('payments').createIndex({ status: 1 });
```

## Cost Optimization

### Redis Memory

```javascript
// Use appropriate TTLs
await storage.savePayment(paymentId, data, 3600); // 1 hour, not forever

// Clean up completed payments
setInterval(async () => {
  const oldPayments = await storage.keys('payment:*');
  for (const key of oldPayments) {
    const payment = await storage.get(key);
    if (payment.status === 'completed' && Date.now() - payment.completedAt > 86400000) {
      await storage.delete(key); // Delete after 24 hours
    }
  }
}, 3600000); // Run hourly
```

### Right-Sizing

- **Start Small**: 512MB Redis, 1 vCPU
- **Monitor**: Watch CPU, memory, request rates
- **Scale Up**: When consistently above 70% utilization
- **Scale Out**: Add instances instead of bigger instances

## Troubleshooting

### High Memory Usage

```bash
# Check Redis memory
redis-cli INFO memory

# Find largest keys
redis-cli --bigkeys

# Clear expired keys manually
redis-cli --scan --pattern "payment:*" | xargs redis-cli DEL
```

### Connection Timeouts

```javascript
// Increase timeout
const storage = createStorage({
  useRedis: true,
  redisUrl: process.env.REDIS_URL,
  socketTimeout: 10000 // 10 seconds
});
```

### Rate Limit Too Strict

```env
# Adjust rate limits
RATE_LIMIT_MAX_REQUESTS=500
RATE_LIMIT_WINDOW_MS=60000
```

## Production Checklist Summary

### Pre-Launch
- [ ] Load tested (1000+ requests)
- [ ] Security audited
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Rollback plan documented

### Launch
- [ ] Deploy to staging first
- [ ] Smoke test all endpoints
- [ ] Monitor errors for 1 hour
- [ ] Gradually increase traffic

### Post-Launch
- [ ] Monitor for 24 hours
- [ ] Review logs daily
- [ ] Check error rates
- [ ] Optimize based on metrics
- [ ] Document incidents

## Support Resources

- [Docker Quickstart](./DOCKER_QUICKSTART.md)
- [Testing Guide](./TESTING.md)
- [Shared Utilities Docs](../shared/README.md)
- [Main README](../README.md)

## Emergency Contacts

Create an emergency runbook with:
- On-call engineer contacts
- Rollback procedures
- Critical service dependencies
- Escalation paths
