# Testing Guide

Comprehensive guide to testing agentic payment vending machines.

## Quick Start

```bash
# Install shared testing utilities
cd shared && npm install && cd ..

# Run tests for a vending machine
cd x402-vending-machine
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Testing Framework

We use **Jest** for all testing, with custom utilities in `shared/testing/`.

### Shared Testing Utilities

The `shared/testing` package provides:
- **Mock AI Agents**: Simulate different agent types and behaviors
- **Payment Helpers**: Test payment flows across protocols
- **Fixtures**: Pre-built test data (products, agents, scenarios)
- **Test Server**: Easy setup/teardown for integration tests

[Full Documentation](../shared/testing/README.md)

## Mock AI Agents

### Basic Usage

```javascript
const { MockAgentClient } = require('../shared/testing');

// Create a mock OpenAI agent
const agent = new MockAgentClient('openai');

// Get headers for requests
const headers = agent.getHeaders();
// {
//   'User-Agent': 'Mozilla/5.0 (compatible; OpenAI-Agent/1.0; ...)',
//   'X-Agent-ID': 'agent-abc123',
//   'X-Agent-Type': 'openai',
//   'Authorization': 'Bearer ...'
// }

// Make a mock purchase
const purchase = await agent.makePurchase(
  'http://localhost:3000/buy/coffee',
  'coffee',
  'crypto'
);
```

### Agent Types

```javascript
// Different agent types
const openai = new MockAgentClient('openai');
const claude = new MockAgentClient('anthropic');
const google = new MockAgentClient('google');
const generic = new MockAgentClient('generic');

// Create a fleet for load testing
const { createAgentFleet } = require('../shared/testing');
const fleet = createAgentFleet(100, ['openai', 'anthropic', 'google']);
```

### Behavior Patterns

```javascript
const { simulatePaymentFlow, agentBehaviors } = require('../shared/testing');

// Legitimate agent (slow, careful)
const result1 = await simulatePaymentFlow(agent, vendingMachine, 'legitimate');

// Aggressive bot (fast, many retries)
const result2 = await simulatePaymentFlow(agent, vendingMachine, 'aggressive');

// Cautious agent (very slow, few retries)
const result3 = await simulatePaymentFlow(agent, vendingMachine, 'cautious');
```

## Payment Testing

### Mock Transactions

```javascript
const { generateMockTransaction, generateMockStripePayment } = require('../shared/testing/payment-helpers');

// Generate blockchain transaction
const tx = generateMockTransaction({
  value: '1000000', // 1 USDC
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
});

// Generate Stripe payment
const payment = generateMockStripePayment({
  amount: 1000, // $10.00
  status: 'succeeded'
});
```

### Payment Verification

```javascript
const { MockPaymentVerifier } = require('../shared/testing/payment-helpers');

// Create verifier with 10% failure rate
const verifier = new MockPaymentVerifier({
  failureRate: 0.1,
  verificationDelay: 500 // ms
});

// Verify payment
const result = await verifier.verifyBlockchainPayment(
  txHash,
  expectedAmount,
  recipientAddress
);

if (result.verified) {
  console.log('Payment verified:', result.transaction);
} else {
  console.log('Verification failed:', result.error);
}
```

### Payment State Machine

```javascript
const { PaymentStateMachine } = require('../shared/testing/payment-helpers');

const stateMachine = new PaymentStateMachine();

// Check valid transitions
if (stateMachine.can('initiated')) {
  stateMachine.transition('initiated');
}

stateMachine.transition('pending');
stateMachine.transition('processing');
stateMachine.transition('completed');

// Get history
const history = stateMachine.getHistory();
// [
//   { from: 'idle', to: 'initiated', timestamp: ... },
//   { from: 'initiated', to: 'pending', timestamp: ... },
//   ...
// ]
```

### Testing Complete Payment Flows

```javascript
const { testPaymentFlow } = require('../shared/testing/payment-helpers');

describe('x402 Payment Flow', () => {
  test('successful payment', async () => {
    const result = await testPaymentFlow({
      protocol: 'x402',
      amount: 500,
      productId: 'coffee',
      agentId: 'agent-001',
      expectedOutcome: 'success'
    });

    expect(result.success).toBe(true);
    expect(result.state).toBe('completed');
    expect(result.steps).toHaveLength(4);
  });

  test('payment timeout', async () => {
    const result = await testPaymentFlow({
      protocol: 'x402',
      amount: 500,
      productId: 'coffee',
      agentId: 'agent-001',
      expectedOutcome: 'timeout'
    });

    expect(result.success).toBe(false);
    expect(result.state).toBe('expired');
  });
});
```

## Test Fixtures

### Using Pre-Built Data

```javascript
const { fixtures } = require('../shared/testing');

describe('Product Tests', () => {
  test('valid product', () => {
    const product = fixtures.products.coffee;
    expect(product.id).toBe('coffee');
    expect(product.price).toBe(500);
    expect(product.inStock).toBe(true);
  });

  test('out of stock product', () => {
    const product = fixtures.products.outOfStock;
    expect(product.inStock).toBe(false);
  });
});

describe('Agent Tests', () => {
  test('legitimate agent', () => {
    const agent = fixtures.agents.legitimate;
    expect(agent.trustScore).toBeGreaterThan(80);
    expect(agent.authorized).toBe(true);
  });

  test('suspicious agent', () => {
    const agent = fixtures.agents.suspicious;
    expect(agent.trustScore).toBeLessThan(50);
  });
});
```

### Error Scenarios

```javascript
const { fixtures } = require('../shared/testing');

describe('Error Handling', () => {
  test('invalid product', async () => {
    const scenario = fixtures.errorScenarios.invalidProduct;

    const response = await request(app)
      .get(`/buy/${scenario.productId}`);

    expect(response.status).toBe(scenario.expectedStatus);
    expect(response.body.error).toContain(scenario.expectedError);
  });

  test('insufficient payment', async () => {
    const scenario = fixtures.errorScenarios.insufficientPayment;

    const response = await confirmPayment({
      paymentId: 'test-123',
      amount: scenario.amount
    });

    expect(response.status).toBe(scenario.expectedStatus);
  });
});
```

### Payment Credentials

```javascript
const { fixtures } = require('../shared/testing');

// Crypto test credentials
const usdc = fixtures.paymentCredentials.crypto.usdc;
console.log(usdc.token); // 'USDC'
console.log(usdc.address); // Contract address

// Stripe test cards
const visa = fixtures.paymentCredentials.stripe.testCards.visa;
const declined = fixtures.paymentCredentials.stripe.testCards.declined;

// Use in tests
await processPayment({
  cardNumber: visa.number,
  expMonth: visa.exp_month,
  expYear: visa.exp_year,
  cvc: visa.cvc
});
```

## Test Server Setup

### Basic Setup

```javascript
const { TestServer } = require('../shared/testing/test-server');
const app = require('./server');

describe('Vending Machine API', () => {
  let server;

  beforeAll(async () => {
    server = new TestServer(app);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  test('health check', async () => {
    const response = await request(server.getURL('/health'));
    expect(response.status).toBe(200);
  });
});
```

### Multiple Services

```javascript
const { TestServerManager } = require('../shared/testing/test-server');

describe('Multi-Service Tests', () => {
  let manager;

  beforeAll(async () => {
    manager = new TestServerManager();
    await manager.addServer('x402', x402App);
    await manager.addServer('mastercard', mastercardApp);
  });

  afterAll(async () => {
    await manager.stopAll();
  });

  test('cross-protocol payment', async () => {
    const x402Server = manager.getServer('x402');
    const mcServer = manager.getServer('mastercard');

    // Test logic...
  });
});
```

### Complete Environment Setup

```javascript
const { setupTestEnvironment } = require('../shared/testing/test-server');

describe('Integration Tests', () => {
  let env;

  beforeAll(async () => {
    env = await setupTestEnvironment({
      x402: x402App,
      ap2: ap2App,
      acp: acpApp,
      mastercard: mastercardApp
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  test('all services healthy', async () => {
    for (const [name, url] of Object.entries(env.urls)) {
      const response = await env.request(`${url}/health`);
      expect(response.status).toBe(200);
    }
  });
});
```

## Integration Testing

### Testing with Redis

```javascript
const { createStorage } = require('../shared/storage');

describe('Payment Storage', () => {
  let storage;

  beforeAll(async () => {
    storage = createStorage({ useRedis: false }); // Use in-memory for tests
    await storage.initialize();
  });

  afterAll(async () => {
    await storage.close();
  });

  afterEach(async () => {
    // Clean up test data
    const keys = await storage.keys('*');
    for (const key of keys) {
      await storage.delete(key);
    }
  });

  test('save and retrieve payment', async () => {
    await storage.savePayment('test-123', {
      amount: 500,
      status: 'pending'
    });

    const payment = await storage.getPayment('test-123');
    expect(payment.amount).toBe(500);
    expect(payment.status).toBe('pending');
  });
});
```

### Testing with Mock Storage

```javascript
const { MockStorage } = require('../shared/testing/test-server');

describe('Storage Tests', () => {
  let storage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  test('TTL expiration', async () => {
    await storage.set('key', 'value', 1); // 1 second TTL

    let value = await storage.get('key');
    expect(value).toBe('value');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    value = await storage.get('key');
    expect(value).toBeNull();
  });
});
```

## Load Testing

### Simple Load Test

```javascript
const { createAgentFleet } = require('../shared/testing');

describe('Load Tests', () => {
  test('100 concurrent agents', async () => {
    const fleet = createAgentFleet(100);

    const start = Date.now();
    const promises = fleet.map(agent =>
      makePurchase(agent, 'coffee')
    );

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;

    console.log(`Completed 100 requests in ${duration}ms`);
    console.log(`Successes: ${successes}, Failures: ${failures}`);

    expect(successes).toBeGreaterThan(90); // 90% success rate
  });
});
```

### Behavior-Based Load Testing

```javascript
const { createAgentFleet, simulatePaymentFlow } = require('../shared/testing');

async function loadTest() {
  const fleet = createAgentFleet(100, ['openai', 'anthropic', 'google']);

  const results = await Promise.all(
    fleet.map(agent =>
      simulatePaymentFlow(agent, vendingMachine, 'legitimate')
    )
  );

  const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
  const totalSuccesses = results.reduce((sum, r) => sum + r.successes, 0);
  const averageTiming = results.reduce((sum, r) => sum + r.timings[0], 0) / results.length;

  console.log(`Total Attempts: ${totalAttempts}`);
  console.log(`Total Successes: ${totalSuccesses}`);
  console.log(`Average Timing: ${averageTiming}ms`);
  console.log(`Success Rate: ${(totalSuccesses/totalAttempts*100).toFixed(2)}%`);
}
```

## Security Testing

### Rate Limit Testing

```javascript
describe('Rate Limiting', () => {
  test('blocks after max requests', async () => {
    const agent = new MockAgentClient('generic');

    // Make 101 requests (limit is 100)
    for (let i = 0; i < 101; i++) {
      const response = await request(app)
        .get('/inventory')
        .set(agent.getHeaders());

      if (i < 100) {
        expect(response.status).not.toBe(429);
      } else {
        expect(response.status).toBe(429);
        expect(response.body.error).toContain('Rate limit');
      }
    }
  });
});
```

### Input Validation Testing

```javascript
describe('Input Validation', () => {
  test('rejects XSS attempts', async () => {
    const malicious = '<script>alert("xss")</script>';

    const response = await request(app)
      .post('/api/purchase')
      .send({ productId: malicious });

    // Should sanitize input
    expect(response.body.productId).not.toContain('<script>');
  });

  test('prevents prototype pollution', async () => {
    const response = await request(app)
      .post('/api/purchase')
      .send({ __proto__: { polluted: true } });

    expect(response.status).toBe(400);
  });
});
```

## Best Practices

### 1. Use Fixtures

```javascript
// ✅ Good
const product = fixtures.products.coffee;

// ❌ Bad
const product = { id: 'coffee', price: 500, ... };
```

### 2. Mock External Services

```javascript
// ✅ Good - Use mock verifier
const verifier = new MockPaymentVerifier({ failureRate: 0.1 });

// ❌ Bad - Call real blockchain
const tx = await web3.eth.getTransaction(txHash);
```

### 3. Clean Up After Tests

```javascript
afterEach(async () => {
  await storage.clear();
  await server.stop();
});
```

### 4. Test Both Happy and Error Paths

```javascript
describe('Purchase Flow', () => {
  test('successful purchase', async () => { ... });
  test('insufficient payment', async () => { ... });
  test('expired payment', async () => { ... });
  test('invalid product', async () => { ... });
});
```

### 5. Use Realistic Test Data

```javascript
// ✅ Good - Use fixtures
const agent = fixtures.agents.legitimate;

// ❌ Bad - Unrealistic data
const agent = { id: 'test', trustScore: 999999 };
```

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd shared && npm install
      - run: cd x402-vending-machine && npm install && npm test
      - run: cd mastercard-vending-machine && npm install && npm test
```

## Debugging Tests

### Enable Verbose Logging

```bash
# Run with debug logs
LOG_LEVEL=debug npm test

# Run specific test file
npm test -- payment.test.js

# Run with verbose output
npm test -- --verbose
```

### Inspect Test Failures

```javascript
test('payment flow', async () => {
  const result = await testPaymentFlow({...});

  // Log full result on failure
  if (!result.success) {
    console.log('Full result:', JSON.stringify(result, null, 2));
  }

  expect(result.success).toBe(true);
});
```

## Next Steps

- Browse [shared/testing README](../shared/testing/README.md) for complete API docs
- See protocol-specific test examples in each vending machine
- Check out [Docker Quickstart](./DOCKER_QUICKSTART.md) for integration testing
- Review [Production Guide](./PRODUCTION.md) for production testing strategies
