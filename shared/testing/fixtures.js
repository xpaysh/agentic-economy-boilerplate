/**
 * Test Fixtures
 *
 * Common test data for all vending machines
 */

// Product catalog fixtures
const products = {
  coffee: {
    id: 'coffee',
    name: 'Coffee',
    description: 'Fresh brewed coffee',
    price: 500,
    currency: 'USD',
    category: 'beverages',
    inStock: true
  },
  tea: {
    id: 'tea',
    name: 'Tea',
    description: 'Hot tea',
    price: 300,
    currency: 'USD',
    category: 'beverages',
    inStock: true
  },
  sandwich: {
    id: 'sandwich',
    name: 'Sandwich',
    description: 'Turkey and cheese sandwich',
    price: 800,
    currency: 'USD',
    category: 'food',
    inStock: true
  },
  outOfStock: {
    id: 'chips',
    name: 'Chips',
    description: 'Potato chips',
    price: 200,
    currency: 'USD',
    category: 'snacks',
    inStock: false
  }
};

// Agent profiles
const agents = {
  legitimate: {
    id: 'agent-legitimate-001',
    name: 'Shopping Agent Pro',
    type: 'openai',
    trustScore: 95,
    purchaseHistory: 150,
    authorized: true
  },
  suspicious: {
    id: 'agent-suspicious-002',
    name: 'Sketchy Bot',
    type: 'generic',
    trustScore: 35,
    purchaseHistory: 2,
    authorized: false
  },
  enterprise: {
    id: 'agent-enterprise-003',
    name: 'Corporate Procurement Agent',
    type: 'google',
    trustScore: 100,
    purchaseHistory: 5000,
    authorized: true,
    organization: 'Acme Corp'
  },
  new: {
    id: 'agent-new-004',
    name: 'First Time Agent',
    type: 'anthropic',
    trustScore: 50,
    purchaseHistory: 0,
    authorized: true
  }
};

// Payment credentials
const paymentCredentials = {
  crypto: {
    usdc: {
      token: 'USDC',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    },
    eth: {
      token: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    },
    dai: {
      token: 'DAI',
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    }
  },
  stripe: {
    testCards: {
      visa: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2030,
        cvc: '123'
      },
      mastercard: {
        number: '5555555555554444',
        exp_month: 12,
        exp_year: 2030,
        cvc: '123'
      },
      declined: {
        number: '4000000000000002',
        exp_month: 12,
        exp_year: 2030,
        cvc: '123'
      }
    }
  },
  mastercard: {
    testCards: {
      approved: {
        number: '5105105105105100',
        exp_month: '12',
        exp_year: '30',
        cvv: '123',
        responseCode: '00'
      },
      declined: {
        number: '5105105105105101',
        exp_month: '12',
        exp_year: '30',
        cvv: '123',
        responseCode: '05'
      }
    }
  }
};

// Error scenarios
const errorScenarios = {
  invalidProduct: {
    description: 'Product does not exist',
    productId: 'non-existent-product',
    expectedStatus: 404,
    expectedError: 'Product not found'
  },
  insufficientPayment: {
    description: 'Payment amount too low',
    amount: 100,
    expectedAmount: 500,
    expectedStatus: 402,
    expectedError: 'Insufficient payment'
  },
  expiredPayment: {
    description: 'Payment window expired',
    expiresAt: Date.now() - 1000,
    expectedStatus: 408,
    expectedError: 'Payment expired'
  },
  unauthorizedAgent: {
    description: 'Agent not authorized',
    agentId: 'unauthorized-agent',
    expectedStatus: 403,
    expectedError: 'Agent not authorized'
  },
  rateLimitExceeded: {
    description: 'Too many requests',
    requestCount: 101,
    expectedStatus: 429,
    expectedError: 'Rate limit exceeded'
  },
  invalidToken: {
    description: 'Invalid payment token',
    token: 'INVALID',
    expectedStatus: 400,
    expectedError: 'Invalid token'
  }
};

// Success scenarios
const successScenarios = {
  simplePurchase: {
    description: 'Basic product purchase',
    productId: 'coffee',
    amount: 500,
    agentId: 'agent-legitimate-001',
    expectedStatus: 200
  },
  multiplePurchases: {
    description: 'Multiple product purchase',
    items: [
      { productId: 'coffee', quantity: 2 },
      { productId: 'tea', quantity: 1 }
    ],
    totalAmount: 1300,
    agentId: 'agent-enterprise-003',
    expectedStatus: 200
  },
  largePurchase: {
    description: 'High-value purchase',
    productId: 'sandwich',
    quantity: 100,
    amount: 80000,
    agentId: 'agent-enterprise-003',
    expectedStatus: 200
  }
};

// API response templates
const responseTemplates = {
  success: {
    status: 'success',
    message: 'Operation completed successfully'
  },
  error: {
    status: 'error',
    message: 'Operation failed'
  },
  paymentRequired: {
    status: 'payment_required',
    message: 'Payment required to complete request'
  }
};

// Environment configurations
const environments = {
  test: {
    NODE_ENV: 'test',
    USE_REDIS: 'false',
    LOG_LEVEL: 'error',
    MOCK_PAYMENTS: 'true'
  },
  development: {
    NODE_ENV: 'development',
    USE_REDIS: 'false',
    LOG_LEVEL: 'debug',
    MOCK_PAYMENTS: 'true'
  },
  production: {
    NODE_ENV: 'production',
    USE_REDIS: 'true',
    LOG_LEVEL: 'info',
    MOCK_PAYMENTS: 'false'
  }
};

// Test timings
const timings = {
  paymentWindow: 15 * 60 * 1000, // 15 minutes
  shortTimeout: 1000, // 1 second
  mediumTimeout: 5000, // 5 seconds
  longTimeout: 30000, // 30 seconds
  sessionExpiry: 30 * 60 * 1000, // 30 minutes
  rateLimitWindow: 60 * 1000 // 1 minute
};

// Mock blockchain data
const blockchainData = {
  validTransaction: {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: 15000000,
    blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    value: '1000000', // 1 USDC (6 decimals)
    gasUsed: '65000',
    gasPrice: '30000000000', // 30 gwei
    confirmations: 12,
    status: 'success'
  },
  pendingTransaction: {
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    value: '1000000',
    status: 'pending',
    confirmations: 0
  },
  failedTransaction: {
    hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    blockNumber: 15000001,
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    value: '1000000',
    status: 'failed',
    error: 'insufficient funds'
  }
};

module.exports = {
  products,
  agents,
  paymentCredentials,
  errorScenarios,
  successScenarios,
  responseTemplates,
  environments,
  timings,
  blockchainData
};
