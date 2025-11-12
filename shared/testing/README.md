# Testing Utilities

Comprehensive testing helpers for agentic payment vending machines.

## Features

- **Mock AI Agents**: Simulate different agent behaviors and credentials
- **Payment Helpers**: Test payment flows across all protocols
- **Fixtures**: Common test data for products, agents, and scenarios
- **Test Server**: Easy setup and teardown of test servers

## Quick Start

```javascript
const { MockAgentClient, fixtures, paymentHelpers, testServer } = require('@agentic-economy/shared/testing');

// Create a mock AI agent
const agent = new MockAgentClient('openai');

// Use test fixtures
const product = fixtures.products.coffee;

// Test a payment flow
const result = await paymentHelpers.testPaymentFlow({
  protocol: 'x402',
  amount: product.price,
  productId: product.id,
  agentId: agent.credentials.agentId
});
```

## Mock AI Agents

### Creating Mock Agents

```javascript
const { MockAgentClient, createAgentFleet } = require('@agentic-economy/shared/testing');

// Single agent
const openAIAgent = new MockAgentClient('openai');
const googleAgent = new MockAgentClient('google');
const genericAgent = new MockAgentClient('generic');

// Fleet of agents for load testing
const fleet = createAgentFleet(100, ['openai', 'anthropic', 'google']);
```

### Agent Types

- `openai` - OpenAI agent with appropriate User-Agent
- `anthropic` - Claude agent
- `google` - Google Shopping agent
- `generic` - Generic AI agent
- `human` - Regular browser (for comparison)

### Using Mock Agents

```javascript
// Get headers for requests
const headers = agent.getHeaders();

// Make a purchase
const purchase = await agent.makePurchase(
  'http://localhost:3000/api/purchase',
  'coffee',
  'crypto'
);

// Confirm payment
const confirmation = await agent.confirmPayment(
  'http://localhost:3000/api/confirm',
  'payment-123'
);
```

### Simulating Behavior Patterns

```javascript
const { simulatePaymentFlow, agentBehaviors } = require('@agentic-economy/shared/testing');

// Legitimate agent
const result1 = await simulatePaymentFlow(agent, vendingMachine, 'legitimate');

// Aggressive bot
const result2 = await simulatePaymentFlow(agent, vendingMachine, 'aggressive');

// Cautious agent
const result3 = await simulatePaymentFlow(agent, vendingMachine, 'cautious');
```

## Payment Helpers

### Mock Transactions

```javascript
const {
  generateMockTransaction,
  generateMockStripePayment,
  generateMockMastercardTransaction
} = require('@agentic-economy/shared/testing/payment-helpers');

// Blockchain transaction
const tx = generateMockTransaction({
  value: '1000000',
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
});

// Stripe payment
const payment = generateMockStripePayment({
  amount: 1000,
  status: 'succeeded'
});

// Mastercard transaction
const mcTx = generateMockMastercardTransaction({
  amount: 10.00,
  status: 'approved'
});
```

### Payment Verification

```javascript
const { MockPaymentVerifier } = require('@agentic-economy/shared/testing/payment-helpers');

// Create verifier with 10% failure rate and 500ms delay
const verifier = new MockPaymentVerifier({
  failureRate: 0.1,
  verificationDelay: 500
});

// Verify blockchain payment
const result = await verifier.verifyBlockchainPayment(
  txHash,
  expectedAmount,
  recipientAddress
);

// Verify Stripe payment
const stripeResult = await verifier.verifyStripePayment(
  paymentIntentId,
  expectedAmount
);
```

### Payment State Machine

```javascript
const { PaymentStateMachine } = require('@agentic-economy/shared/testing/payment-helpers');

const stateMachine = new PaymentStateMachine();

// Check if transition is valid
if (stateMachine.can('initiated')) {
  stateMachine.transition('initiated');
}

// Get transition history
const history = stateMachine.getHistory();
```

### Testing Payment Flows

```javascript
const { testPaymentFlow } = require('@agentic-economy/shared/testing/payment-helpers');

// Test successful payment
const success = await testPaymentFlow({
  protocol: 'acp',
  amount: 1000,
  productId: 'coffee',
  agentId: 'agent-001',
  expectedOutcome: 'success'
});

// Test payment failure
const failure = await testPaymentFlow({
  protocol: 'x402',
  amount: 500,
  productId: 'tea',
  agentId: 'agent-002',
  expectedOutcome: 'failure'
});

// Test payment timeout
const timeout = await testPaymentFlow({
  protocol: 'ap2',
  amount: 800,
  productId: 'sandwich',
  agentId: 'agent-003',
  expectedOutcome: 'timeout'
});
```

## Test Fixtures

### Products

```javascript
const { fixtures } = require('@agentic-economy/shared/testing');

const coffee = fixtures.products.coffee;
const tea = fixtures.products.tea;
const outOfStock = fixtures.products.outOfStock;
```

### Agents

```javascript
const legitimateAgent = fixtures.agents.legitimate;
const suspiciousAgent = fixtures.agents.suspicious;
const enterpriseAgent = fixtures.agents.enterprise;
```

### Payment Credentials

```javascript
// Crypto
const usdc = fixtures.paymentCredentials.crypto.usdc;

// Stripe test cards
const visa = fixtures.paymentCredentials.stripe.testCards.visa;
const declined = fixtures.paymentCredentials.stripe.testCards.declined;

// Mastercard test cards
const approved = fixtures.paymentCredentials.mastercard.testCards.approved;
```

### Test Scenarios

```javascript
// Error scenarios
const { invalidProduct, insufficientPayment, expiredPayment } = fixtures.errorScenarios;

// Success scenarios
const { simplePurchase, multiplePurchases, largePurchase } = fixtures.successScenarios;
```

### Blockchain Data

```javascript
const validTx = fixtures.blockchainData.validTransaction;
const pendingTx = fixtures.blockchainData.pendingTransaction;
const failedTx = fixtures.blockchainData.failedTransaction;
```

## Test Server

### Single Server

```javascript
const { TestServer } = require('@agentic-economy/shared/testing/test-server');
const express = require('express');

const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = new TestServer(app);
await server.start();

console.log(server.getURL()); // http://localhost:PORT
console.log(server.getURL('/health')); // http://localhost:PORT/health

// Make requests
const response = await testServer.request(server.getURL('/health'));

// Cleanup
await server.stop();
```

### Multiple Servers

```javascript
const { TestServerManager } = require('@agentic-economy/shared/testing/test-server');

const manager = new TestServerManager();

await manager.addServer('x402', x402App);
await manager.addServer('ap2', ap2App);
await manager.addServer('acp', acpApp);

const urls = manager.getURLs();
console.log(urls);
// {
//   x402: 'http://localhost:3001',
//   ap2: 'http://localhost:3002',
//   acp: 'http://localhost:3003'
// }

// Cleanup all
await manager.stopAll();
```

### Setup Test Environment

```javascript
const { setupTestEnvironment } = require('@agentic-economy/shared/testing/test-server');

const { manager, urls, cleanup, request } = await setupTestEnvironment({
  x402: x402App,
  ap2: ap2App,
  acp: acpApp
});

// Run tests...

// Cleanup
await cleanup();
```

### HTTP Request Helper

```javascript
const { request } = require('@agentic-economy/shared/testing/test-server');

// GET request
const response = await request('http://localhost:3000/api/products');

// POST request
const postResponse = await request('http://localhost:3000/api/purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { productId: 'coffee', amount: 500 }
});

console.log(response.status); // 200
console.log(response.body); // Parsed JSON
```

### Mock Storage

```javascript
const { MockStorage } = require('@agentic-economy/shared/testing/test-server');

const storage = new MockStorage();

await storage.set('key', 'value', 60); // 60 second TTL
const value = await storage.get('key');
await storage.delete('key');
await storage.clear();
```

## Example Test Suite

```javascript
const {
  MockAgentClient,
  fixtures,
  paymentHelpers,
  testServer
} = require('@agentic-economy/shared/testing');

describe('x402 Vending Machine', () => {
  let server;
  let agent;

  beforeAll(async () => {
    const app = require('./server');
    server = new testServer.TestServer(app);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    agent = new MockAgentClient('openai');
  });

  test('should purchase coffee successfully', async () => {
    const product = fixtures.products.coffee;

    // Initiate payment
    const response = await testServer.request(
      server.getURL('/api/purchase'),
      {
        method: 'POST',
        headers: agent.getHeaders(),
        body: { productId: product.id }
      }
    );

    expect(response.status).toBe(402);
    expect(response.body.amount).toBe(product.price);

    // Confirm payment
    const txHash = paymentHelpers.generateMockTransaction().hash;
    const confirmation = await testServer.request(
      server.getURL('/api/confirm'),
      {
        method: 'POST',
        headers: agent.getHeaders(),
        body: {
          paymentId: response.body.paymentId,
          txHash
        }
      }
    );

    expect(confirmation.status).toBe(200);
    expect(confirmation.body.product).toBe(product.id);
  });

  test('should reject insufficient payment', async () => {
    const scenario = fixtures.errorScenarios.insufficientPayment;

    const response = await testServer.request(
      server.getURL('/api/purchase'),
      {
        method: 'POST',
        headers: agent.getHeaders(),
        body: {
          productId: 'coffee',
          amount: scenario.amount
        }
      }
    );

    expect(response.status).toBe(scenario.expectedStatus);
  });
});
```

## Load Testing

```javascript
const { createAgentFleet, simulatePaymentFlow } = require('@agentic-economy/shared/testing');

async function loadTest() {
  const fleet = createAgentFleet(100);
  const results = await Promise.all(
    fleet.map(agent => simulatePaymentFlow(agent, vendingMachine, 'legitimate'))
  );

  const successes = results.filter(r => r.successes > 0).length;
  const failures = results.filter(r => r.failures > 0).length;

  console.log(`Successes: ${successes}, Failures: ${failures}`);
}
```

## Best Practices

1. **Use Fixtures**: Leverage built-in fixtures for consistent test data
2. **Mock Agents**: Use `MockAgentClient` instead of making real requests
3. **Cleanup**: Always cleanup servers and storage after tests
4. **Isolation**: Each test should be independent
5. **Realistic Delays**: Use behavior patterns to simulate real-world timing

## Integration with Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 30000
};

// test/setup.js
const { MockStorage } = require('@agentic-economy/shared/testing/test-server');

global.mockStorage = new MockStorage();

afterEach(async () => {
  await global.mockStorage.clear();
});
```
