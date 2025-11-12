# Storage Layer

Production-ready storage adapter with automatic Redis/in-memory fallback.

## Features

- **Automatic Fallback**: Tries Redis first, falls back to in-memory storage if unavailable
- **Unified API**: Same interface for both Redis and in-memory storage
- **TTL Support**: Automatic expiration for temporary data
- **Helper Methods**: Built-in helpers for payments, products, and sessions
- **Production Ready**: Connection pooling, error handling, and automatic cleanup

## Quick Start

```javascript
const { createStorage } = require('@agentic-economy/shared/storage');

// Initialize storage
const storage = createStorage({
  useRedis: true,
  redisUrl: 'redis://localhost:6379',
  fallbackToMemory: true
});

await storage.initialize();

// Use storage
await storage.set('key', { data: 'value' }, 3600); // TTL in seconds
const data = await storage.get('key');
await storage.delete('key');
```

## Configuration

### Environment Variables

```bash
USE_REDIS=true                          # Enable Redis (default: false)
REDIS_URL=redis://localhost:6379        # Redis connection URL
```

### Programmatic Configuration

```javascript
const storage = createStorage({
  useRedis: true,                    // Enable Redis
  redisUrl: 'redis://localhost:6379', // Redis URL
  fallbackToMemory: true             // Fallback to in-memory if Redis fails (default: true)
});
```

## API Reference

### Basic Operations

```javascript
// Set with optional TTL
await storage.set(key, value, ttl);

// Get value
const value = await storage.get(key);

// Delete key
await storage.delete(key);

// Check existence
const exists = await storage.exists(key);

// Get keys by pattern
const keys = await storage.keys('payment:*');
```

### Hash Operations

```javascript
// Set hash field
await storage.setHash('user:123', 'name', 'Alice');

// Get single field
const name = await storage.getHash('user:123', 'name');

// Get all fields
const user = await storage.getHash('user:123');

// Delete field
await storage.deleteHash('user:123', 'name');

// Delete entire hash
await storage.deleteHash('user:123');
```

### Payment Helpers

```javascript
// Save payment with 1-hour TTL
await storage.savePayment(paymentId, {
  amount: 1000,
  currency: 'USDC',
  status: 'pending'
}, 3600);

// Get payment
const payment = await storage.getPayment(paymentId);

// List all payments
const paymentKeys = await storage.listPayments();

// Delete payment
await storage.deletePayment(paymentId);
```

### Product Helpers

```javascript
// Save product
await storage.saveProduct('product-1', {
  name: 'Coffee',
  price: 500,
  currency: 'USDC'
});

// Get product
const product = await storage.getProduct('product-1');

// List all products
const productKeys = await storage.listProducts();
```

### Session Helpers

```javascript
// Save session with 30-minute TTL
await storage.saveSession(sessionId, {
  userId: '123',
  createdAt: Date.now()
}, 1800);

// Get session
const session = await storage.getSession(sessionId);

// Delete session
await storage.deleteSession(sessionId);
```

## Usage in Vending Machines

### Basic Integration

```javascript
const express = require('express');
const { createStorage } = require('@agentic-economy/shared/storage');

const app = express();
const storage = createStorage();

// Initialize storage on startup
app.listen(3000, async () => {
  await storage.initialize();
  console.log('Server running with storage initialized');
});

// Use in routes
app.post('/api/payments', async (req, res) => {
  const paymentId = generateId();
  await storage.savePayment(paymentId, {
    ...req.body,
    createdAt: Date.now()
  }, 3600);
  res.json({ paymentId });
});
```

### Replace Existing In-Memory Storage

**Before:**
```javascript
const payments = new Map();

payments.set(paymentId, paymentData);
const payment = payments.get(paymentId);
payments.delete(paymentId);
```

**After:**
```javascript
const { createStorage } = require('@agentic-economy/shared/storage');
const storage = createStorage();
await storage.initialize();

await storage.savePayment(paymentId, paymentData);
const payment = await storage.getPayment(paymentId);
await storage.deletePayment(paymentId);
```

## Choosing Between Redis and In-Memory

### Use Redis When:
- Running in production
- Need data persistence across restarts
- Running multiple server instances
- Need high performance at scale

### Use In-Memory When:
- Local development
- Testing
- Single-instance deployments
- Prototyping

## Advanced Features

### Custom Adapters

You can access the underlying adapter directly:

```javascript
const adapter = storage.getAdapter();

// Redis-specific methods
if (adapter instanceof RedisAdapter) {
  await adapter.increment('counter', 5);
  const ttl = await adapter.ttl('key');
}

// In-memory specific methods
if (adapter instanceof InMemoryAdapter) {
  const stats = adapter.getStats();
  console.log(`Keys: ${stats.keys}, Type: ${stats.type}`);
}
```

### Error Handling

```javascript
try {
  await storage.set('key', value);
} catch (error) {
  console.error('Storage operation failed:', error.message);
  // Handle error appropriately
}
```

### Cleanup on Shutdown

```javascript
process.on('SIGTERM', async () => {
  await storage.close();
  process.exit(0);
});
```

## Testing

```javascript
const { createStorage } = require('@agentic-economy/shared/storage');

// Use in-memory storage for tests
const storage = createStorage({ useRedis: false });
await storage.initialize();

// Your tests...

// Cleanup
await storage.close();
```

## Performance Considerations

- **Redis**: Optimized for high throughput, use connection pooling
- **In-Memory**: Automatic cleanup runs every 60 seconds
- **TTL**: Use TTLs to automatically clean up temporary data
- **Batch Operations**: Use `keys()` carefully with large datasets

## Migration Guide

See [MIGRATION.md](../../docs/MIGRATION.md) for detailed instructions on migrating from in-memory to Redis storage.
