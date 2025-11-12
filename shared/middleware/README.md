# Middleware

Production-ready middleware for agentic payment vending machines.

## Features

- **Logger**: Winston-based logging with multiple transports
- **Rate Limiter**: Flexible rate limiting with Redis support
- **Agent Detection**: Detect and classify AI agents vs. humans
- **Error Handler**: Centralized error handling with custom error classes
- **Security**: Helmet, CORS, input sanitization, and more

## Quick Start

```javascript
const express = require('express');
const { middleware } = require('@agentic-economy/shared');

const app = express();

// Apply all security middleware
app.use(middleware.security.securityMiddleware());

// Agent detection
app.use(middleware.agentDetection.agentMiddleware());

// Rate limiting
app.use(middleware.rateLimiter.createRateLimiter());

// Routes...

// Error handling (must be last)
app.use(middleware.errorHandler.notFoundHandler);
app.use(middleware.errorHandler.errorHandler);
```

## Logger

### Basic Usage

```javascript
const { logger } = require('@agentic-economy/shared/middleware');

logger.info('Server started');
logger.warn('Low inventory');
logger.error('Payment failed', { paymentId: '123' });
logger.debug('Request details', { method: 'POST', path: '/api/purchase' });
```

### Configuration

```javascript
// Set via environment variable
process.env.LOG_LEVEL = 'debug'; // error, warn, info, debug

// In production, logs are written to files
// logs/error.log - errors only
// logs/combined.log - all logs
```

## Rate Limiter

### Basic Rate Limiting

```javascript
const { rateLimiter } = require('@agentic-economy/shared/middleware');

// 100 requests per minute
app.use(rateLimiter.createRateLimiter({
  windowMs: 60000,
  max: 100
}));
```

### Payment Endpoint Rate Limiting

```javascript
// Stricter limits for payment endpoints
app.post('/api/purchase',
  rateLimiter.createPaymentRateLimiter({ max: 20 }),
  purchaseHandler
);
```

### Agent-Aware Rate Limiting

```javascript
// Different limits for different agent types
app.use(rateLimiter.createAgentRateLimiter({
  enterpriseLimit: 1000,
  standardLimit: 100,
  suspiciousLimit: 10
}));
```

### Burst Rate Limiting

```javascript
// Allows 10 requests per second, 100 per minute
app.use(rateLimiter.createBurstRateLimiter({
  burstMax: 10,
  max: 100
}));
```

### Cost-Based Rate Limiting

```javascript
// Different endpoints cost different amounts
app.use(rateLimiter.createCostBasedRateLimiter({
  costs: {
    'GET /api/products': 1,
    'POST /api/purchase': 5,
    'POST /api/confirm': 10
  },
  budget: 100 // points per minute
}));
```

## Agent Detection

### Basic Detection

```javascript
const { agentDetection } = require('@agentic-economy/shared/middleware');

// Detect all agents
app.use(agentDetection.detectAgent);

// Access detection results
app.get('/api/products', (req, res) => {
  if (req.isAgent) {
    console.log(`Agent type: ${req.agentType}`);
    console.log(`Confidence: ${req.agentConfidence}`);
  }
});
```

### Require Agent Access

```javascript
// Only allow AI agents
app.post('/api/agent-only',
  agentDetection.requireAgent({ minConfidence: 70 }),
  agentHandler
);
```

### Require Human Access

```javascript
// Only allow human users
app.get('/admin',
  agentDetection.requireHuman(),
  adminHandler
);
```

### Trust Classification

```javascript
// Classify agent trust level
app.use(agentDetection.classifyAgentTrust);

// Require minimum trust
app.post('/api/high-value',
  agentDetection.requireTrustLevel('high'),
  highValueHandler
);

// Trust levels: suspicious, low, medium, high
```

### Complete Agent Middleware Stack

```javascript
// All agent detection features
app.use(agentDetection.agentMiddleware({
  logActivity: true
}));

// Now you have:
// - req.isAgent
// - req.agentType
// - req.agentConfidence
// - req.agentTrustLevel
// - req.agentMetadata
```

## Error Handler

### Basic Error Handling

```javascript
const { errorHandler } = require('@agentic-economy/shared/middleware');

// At the end of your routes
app.use(errorHandler.notFoundHandler);
app.use(errorHandler.errorHandler);
```

### Custom Error Classes

```javascript
const {
  PaymentRequiredError,
  ValidationError,
  NotFoundError,
  ForbiddenError
} = require('@agentic-economy/shared/middleware/error-handler');

app.post('/api/purchase', (req, res, next) => {
  if (!req.body.productId) {
    throw new ValidationError('Product ID is required');
  }

  const product = getProduct(req.body.productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.price > 0) {
    throw new PaymentRequiredError('Payment required', {
      amount: product.price,
      currency: 'USD'
    });
  }

  res.json({ success: true });
});
```

### Async Error Handling

```javascript
const { asyncHandler } = require('@agentic-economy/shared/middleware/error-handler');

// Automatically catches async errors
app.get('/api/products', asyncHandler(async (req, res) => {
  const products = await db.getProducts(); // Errors caught automatically
  res.json(products);
}));
```

### Global Error Handlers

```javascript
const { setupGlobalErrorHandlers } = require('@agentic-economy/shared/middleware/error-handler');

// Setup once at app startup
setupGlobalErrorHandlers();

// Now handles:
// - Uncaught exceptions
// - Unhandled promise rejections
// - SIGTERM/SIGINT signals
```

### Available Error Classes

```javascript
const {
  AppError,              // Base error class
  ValidationError,       // 400
  UnauthorizedError,     // 401
  PaymentRequiredError,  // 402
  ForbiddenError,        // 403
  NotFoundError,         // 404
  PaymentError,          // 400
  RateLimitError,        // 429
  ServiceUnavailableError // 503
} = require('@agentic-economy/shared/middleware/error-handler');
```

## Security

### Complete Security Stack

```javascript
const { security } = require('@agentic-economy/shared/middleware');

// All security features
app.use(security.securityMiddleware({
  helmet: {
    contentSecurityPolicy: true
  },
  cors: {
    origin: 'https://example.com'
  }
}));
```

### CORS Configuration

```javascript
app.use(security.configureCORS({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true,
  methods: ['GET', 'POST']
}));
```

### Input Sanitization

```javascript
// Automatically sanitizes req.body and req.query
app.use(security.sanitizeInput);

// Prevents:
// - XSS attacks
// - Prototype pollution
// - HTML injection
```

### API Key Authentication

```javascript
app.use(security.requireApiKey([
  'key_abc123',
  'key_xyz789'
]));
```

### IP Whitelist/Blacklist

```javascript
// Only allow specific IPs
app.use('/admin', security.ipWhitelist([
  '192.168.1.1',
  '10.0.0.1'
]));

// Block specific IPs
app.use(security.ipBlacklist([
  '123.45.67.89'
]));
```

### Request Signature Verification

```javascript
const secretKey = process.env.SIGNATURE_SECRET;

app.use('/api/payments', security.verifySignature(secretKey));

// Clients must include:
// X-Signature: HMAC-SHA256 signature
// X-Timestamp: Request timestamp
```

### Payment Security Headers

```javascript
// Extra security for payment endpoints
app.use('/api/payments', security.paymentSecurityHeaders);
```

### Content Type Validation

```javascript
// Only accept JSON
app.use(security.validateContentType(['application/json']));

// Accept multiple types
app.use(security.validateContentType([
  'application/json',
  'application/x-www-form-urlencoded'
]));
```

## Complete Example

```javascript
const express = require('express');
const { middleware } = require('@agentic-economy/shared');

const app = express();

// 1. Request ID (first)
app.use(middleware.security.requestId);

// 2. Security headers
app.use(middleware.security.configureHelmet());
app.use(middleware.security.configureCORS());

// 3. Body parsing
app.use(express.json());

// 4. Input sanitization
app.use(middleware.security.sanitizeInput);

// 5. Agent detection
app.use(middleware.agentDetection.agentMiddleware());

// 6. Rate limiting
app.use(middleware.rateLimiter.createAgentRateLimiter());

// 7. Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/products', (req, res) => {
  res.json([
    { id: 'coffee', price: 500 },
    { id: 'tea', price: 300 }
  ]);
});

app.post('/api/purchase',
  middleware.agentDetection.requireAgent(),
  middleware.rateLimiter.createPaymentRateLimiter(),
  middleware.security.paymentSecurityHeaders,
  middleware.errorHandler.asyncHandler(async (req, res) => {
    // Purchase logic...
    res.json({ success: true });
  })
);

// 8. Error handling (last)
app.use(middleware.errorHandler.notFoundHandler);
app.use(middleware.errorHandler.errorLogger);
app.use(middleware.errorHandler.errorHandler);

// 9. Global error handlers
middleware.errorHandler.setupGlobalErrorHandlers();

app.listen(3000, () => {
  middleware.logger.info('Server started on port 3000');
});
```

## Environment Variables

```bash
# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=*

# Security
API_KEY=your-api-key-here
SIGNATURE_SECRET=your-signature-secret-here
```

## Best Practices

1. **Apply security middleware first**: Before any routes
2. **Use request ID**: For tracking and debugging
3. **Rate limit payment endpoints**: Use stricter limits
4. **Sanitize input**: Always sanitize user input
5. **Use async handlers**: For automatic error catching
6. **Log appropriately**: Use correct log levels
7. **Setup global handlers**: Catch uncaught errors
8. **Error handling last**: Must be the last middleware

## Production Checklist

- [ ] Enable Helmet security headers
- [ ] Configure CORS properly (not *)
- [ ] Use Redis-backed rate limiting
- [ ] Enable request signing for sensitive endpoints
- [ ] Setup API key authentication
- [ ] Configure IP whitelist for admin endpoints
- [ ] Enable agent trust classification
- [ ] Setup error logging to external service
- [ ] Use HTTPS in production
- [ ] Set LOG_LEVEL to 'warn' or 'error'
