/**
 * Mock AI Agents
 *
 * Simulates different AI agent behaviors for testing
 */

const crypto = require('crypto');

/**
 * Generate mock User-Agent strings for different AI agents
 */
const userAgents = {
  openai: 'Mozilla/5.0 (compatible; OpenAI-Agent/1.0; +https://openai.com/agent)',
  anthropic: 'Mozilla/5.0 (compatible; Claude-Agent/1.0; +https://anthropic.com/agent)',
  google: 'Mozilla/5.0 (compatible; Google-Agent/1.0; +https://google.com/shopping-agent)',
  generic: 'AI-Agent/1.0',
  human: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

/**
 * Generate mock agent credentials
 */
function generateAgentCredentials(agentType = 'generic') {
  return {
    agentId: `agent-${crypto.randomBytes(8).toString('hex')}`,
    agentType,
    apiKey: crypto.randomBytes(32).toString('hex'),
    publicKey: crypto.randomBytes(64).toString('hex')
  };
}

/**
 * Create mock JWT for AP2 protocol
 */
function createMockJWT(agentId, issuer = 'https://test-issuer.com') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: agentId,
    iss: issuer,
    aud: 'vending-machine',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    agent_type: 'enterprise',
    permissions: ['read', 'purchase']
  })).toString('base64url');
  const signature = crypto.randomBytes(32).toString('base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Create mock Verifiable Credential
 */
function createVerifiableCredential(agentId) {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'AgentCredential'],
    issuer: 'https://test-issuer.com',
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: agentId,
      type: 'AIAgent',
      capabilities: ['payment', 'purchase'],
      authorizationLevel: 'standard'
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: 'https://test-issuer.com/keys/1',
      proofValue: crypto.randomBytes(64).toString('base64')
    }
  };
}

/**
 * Mock agent HTTP client
 */
class MockAgentClient {
  constructor(agentType = 'generic', options = {}) {
    this.agentType = agentType;
    this.credentials = generateAgentCredentials(agentType);
    this.userAgent = options.userAgent || userAgents[agentType] || userAgents.generic;
    this.jwt = options.jwt || createMockJWT(this.credentials.agentId);
  }

  /**
   * Get headers for HTTP requests
   */
  getHeaders() {
    return {
      'User-Agent': this.userAgent,
      'X-Agent-ID': this.credentials.agentId,
      'X-Agent-Type': this.agentType,
      'Authorization': `Bearer ${this.jwt}`
    };
  }

  /**
   * Make a mock purchase request
   */
  async makePurchase(endpoint, productId, paymentMethod = 'crypto') {
    return {
      url: endpoint,
      method: 'POST',
      headers: this.getHeaders(),
      body: {
        productId,
        paymentMethod,
        agentId: this.credentials.agentId,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Simulate payment confirmation
   */
  async confirmPayment(endpoint, paymentId, proof = null) {
    return {
      url: endpoint,
      method: 'POST',
      headers: this.getHeaders(),
      body: {
        paymentId,
        proof: proof || {
          txHash: crypto.randomBytes(32).toString('hex'),
          blockNumber: Math.floor(Math.random() * 1000000),
          timestamp: Date.now()
        }
      }
    };
  }
}

/**
 * Create a fleet of mock agents for load testing
 */
function createAgentFleet(count = 10, types = ['openai', 'anthropic', 'google', 'generic']) {
  const fleet = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    fleet.push(new MockAgentClient(type));
  }
  return fleet;
}

/**
 * Simulate agent behavior patterns
 */
const agentBehaviors = {
  // Legitimate purchasing agent
  legitimate: {
    requestDelay: () => 1000 + Math.random() * 2000, // 1-3 seconds between requests
    errorRate: 0.02, // 2% error rate
    retryAttempts: 2
  },

  // Aggressive bot
  aggressive: {
    requestDelay: () => 100 + Math.random() * 200, // 0.1-0.3 seconds
    errorRate: 0.05,
    retryAttempts: 5
  },

  // Cautious agent
  cautious: {
    requestDelay: () => 3000 + Math.random() * 5000, // 3-8 seconds
    errorRate: 0.01,
    retryAttempts: 1
  }
};

/**
 * Simulate payment flow
 */
async function simulatePaymentFlow(agent, vendingMachine, behavior = 'legitimate') {
  const pattern = agentBehaviors[behavior];
  const results = {
    attempts: 0,
    successes: 0,
    failures: 0,
    timings: []
  };

  const startTime = Date.now();

  try {
    // Step 1: Browse products
    await new Promise(resolve => setTimeout(resolve, pattern.requestDelay()));
    results.attempts++;

    // Step 2: Initiate payment
    await new Promise(resolve => setTimeout(resolve, pattern.requestDelay()));
    results.attempts++;

    // Simulate random failure
    if (Math.random() < pattern.errorRate) {
      throw new Error('Simulated payment failure');
    }

    // Step 3: Confirm payment
    await new Promise(resolve => setTimeout(resolve, pattern.requestDelay()));
    results.attempts++;

    results.successes++;
  } catch (error) {
    results.failures++;

    // Retry logic
    for (let retry = 0; retry < pattern.retryAttempts; retry++) {
      await new Promise(resolve => setTimeout(resolve, pattern.requestDelay()));
      results.attempts++;

      if (Math.random() >= pattern.errorRate) {
        results.successes++;
        break;
      }
    }
  }

  results.timings.push(Date.now() - startTime);
  return results;
}

module.exports = {
  userAgents,
  generateAgentCredentials,
  createMockJWT,
  createVerifiableCredential,
  MockAgentClient,
  createAgentFleet,
  agentBehaviors,
  simulatePaymentFlow
};
