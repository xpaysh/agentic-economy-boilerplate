# Docker Quickstart Guide

Get all vending machines running with Docker in 2 minutes.

## Prerequisites

- Docker Desktop installed (includes Docker Compose)
- 4GB+ RAM available
- Ports 3000-3003, 6379, 8081 available

## Quick Start

### 1. Clone and Navigate

```bash
git clone https://github.com/xpaysh/agentic-economy-boilerplate
cd agentic-economy-boilerplate
```

### 2. Configure Environment (Optional)

```bash
# Copy environment template
cp .env.example .env

# Edit if you have real API keys (otherwise mock mode works)
nano .env
```

### 3. Start Everything

```bash
# Start all services
docker-compose up

# Or run in background
docker-compose up -d
```

**That's it!** All vending machines are now running:

- **x402**: http://localhost:3000
- **AP2**: http://localhost:3001
- **ACP**: http://localhost:3002
- **Mastercard**: http://localhost:3003
- **Redis Commander**: http://localhost:8081

## Testing the Services

### x402 Vending Machine

```bash
# Get inventory
curl http://localhost:3000/inventory

# Try to buy (returns 402 Payment Required)
curl http://localhost:3000/buy/classic-cola

# Health check
curl http://localhost:3000/health
```

### Mastercard Vending Machine

```bash
# Get products
curl http://localhost:3003/api/products

# Create payment session
curl -X POST http://localhost:3003/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"productId": "coffee", "agentId": "test-agent"}'
```

### AP2 Vending Machine

```bash
# Requires AP2 authorization header
curl http://localhost:3001/ap2/catalog \
  -H "AP2-Authorization: Bearer {your-vc-jwt}"
```

### ACP Vending Machine

```bash
# Get products
curl http://localhost:3002/api/products

# Check health
curl http://localhost:3002/health
```

## Development Mode

### Start Only Redis (for local development)

```bash
# Start Redis + Redis Commander only
docker-compose -f docker-compose.dev.yml up

# Then run vending machines locally
cd x402-vending-machine && npm run dev
```

**Access Redis Commander**: http://localhost:8081
- View all keys
- Inspect payment data
- Monitor storage in real-time

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f x402-vending
docker-compose logs -f redis
```

### Stop Services

```bash
# Stop all
docker-compose down

# Stop and remove volumes (clears Redis data)
docker-compose down -v
```

### Restart a Service

```bash
# Restart specific service
docker-compose restart x402-vending

# Rebuild and restart
docker-compose up -d --build x402-vending
```

### Check Service Status

```bash
# List running containers
docker-compose ps

# Check resource usage
docker stats
```

## Configuration

### Environment Variables

Edit `.env` in the root directory:

```env
# Storage
USE_REDIS=true
REDIS_URL=redis://redis:6379

# Ports
X402_PORT=3000
AP2_PORT=3001
ACP_PORT=3002
MASTERCARD_PORT=3003

# Payment Providers (optional - mock mode works without these)
STRIPE_SECRET_KEY=sk_test_...
MASTERCARD_API_KEY=...
```

### Scaling Services

```bash
# Run multiple instances of a service
docker-compose up -d --scale x402-vending=3
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG

# View Redis logs
docker-compose logs redis
```

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs x402-vending

# Rebuild container
docker-compose build x402-vending
docker-compose up -d x402-vending

# Remove and recreate
docker-compose rm -f x402-vending
docker-compose up -d x402-vending
```

### Out of Memory

```bash
# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory → 4GB+

# Check current usage
docker stats
```

### Shared Utilities Not Found

```bash
# Install shared dependencies first
docker-compose exec x402-vending npm install

# Or rebuild with fresh install
docker-compose up -d --build
```

## Production Deployment

For production, use separate compose file:

```bash
# Production configuration
docker-compose -f docker-compose.prod.yml up -d
```

See [Production Deployment Guide](./PRODUCTION.md) for details.

## Advanced Usage

### Access Container Shell

```bash
# Get shell in container
docker-compose exec x402-vending sh

# Run commands in container
docker-compose exec x402-vending npm test
```

### View Redis Data

```bash
# Using Redis CLI
docker-compose exec redis redis-cli

# List all keys
KEYS *

# Get payment data
GET payment:payment_123456

# Or use Redis Commander web UI
open http://localhost:8081
```

### Network Inspection

```bash
# View network details
docker network inspect agentic-network

# Test connectivity between services
docker-compose exec x402-vending ping redis
```

## Docker Compose Files

### docker-compose.yml (Production)
- All 4 vending machines
- Redis with persistence
- Health checks enabled
- Restart policies

### docker-compose.dev.yml (Development)
- Redis only
- Redis Commander web UI
- No vending machines (run locally)
- No restart policies

## Resource Requirements

### Minimum

- **CPU**: 2 cores
- **RAM**: 2GB
- **Disk**: 1GB

### Recommended

- **CPU**: 4 cores
- **RAM**: 4GB
- **Disk**: 5GB (for logs and Redis persistence)

## Next Steps

1. **Explore APIs**: Try different endpoints on each service
2. **Read Docs**: Check protocol-specific READMEs
3. **Test Payments**: Use mock agents from `shared/testing`
4. **Monitor**: Watch Redis Commander to see data flow
5. **Customize**: Modify vending machine code and rebuild

## Quick Reference

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Restart service
docker-compose restart x402-vending

# Rebuild service
docker-compose up -d --build x402-vending

# View Redis data
open http://localhost:8081

# Clean everything
docker-compose down -v
```

## Getting Help

- **Redis not connecting**: Check `docker-compose ps redis`
- **Port conflicts**: Change ports in `docker-compose.yml`
- **Out of memory**: Increase Docker Desktop memory limit
- **Build failures**: Run `docker-compose build --no-cache`

For more help, see:
- [Testing Guide](./TESTING.md)
- [Production Deployment](./PRODUCTION.md)
- [Main README](../README.md)
