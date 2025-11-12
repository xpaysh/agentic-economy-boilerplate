/**
 * Payment Test Helpers
 *
 * Utilities for testing payment flows across different protocols
 */

const crypto = require('crypto');

/**
 * Generate mock blockchain transaction
 */
function generateMockTransaction(options = {}) {
  return {
    hash: options.hash || '0x' + crypto.randomBytes(32).toString('hex'),
    from: options.from || '0x' + crypto.randomBytes(20).toString('hex'),
    to: options.to || '0x' + crypto.randomBytes(20).toString('hex'),
    value: options.value || '1000000000000000000', // 1 ETH in wei
    blockNumber: options.blockNumber || Math.floor(Math.random() * 1000000),
    blockHash: '0x' + crypto.randomBytes(32).toString('hex'),
    timestamp: options.timestamp || Math.floor(Date.now() / 1000),
    gasUsed: '21000',
    status: options.status || 'success',
    confirmations: options.confirmations || 12
  };
}

/**
 * Generate mock Stripe payment intent
 */
function generateMockStripePayment(options = {}) {
  return {
    id: options.id || 'pi_' + crypto.randomBytes(12).toString('hex'),
    object: 'payment_intent',
    amount: options.amount || 1000, // in cents
    currency: options.currency || 'usd',
    status: options.status || 'succeeded',
    customer: options.customer || 'cus_' + crypto.randomBytes(10).toString('hex'),
    payment_method: options.paymentMethod || 'pm_' + crypto.randomBytes(12).toString('hex'),
    created: Math.floor(Date.now() / 1000),
    metadata: options.metadata || {
      agentId: 'agent-test-001',
      productId: 'coffee'
    }
  };
}

/**
 * Generate mock Mastercard transaction
 */
function generateMockMastercardTransaction(options = {}) {
  return {
    transactionId: options.transactionId || 'MC' + crypto.randomBytes(16).toString('hex').toUpperCase(),
    merchantId: options.merchantId || 'MERCHANT123',
    amount: options.amount || 10.00,
    currency: options.currency || 'USD',
    cardNumber: options.cardNumber || '**** **** **** 1234',
    cardType: options.cardType || 'credit',
    status: options.status || 'approved',
    authorizationCode: crypto.randomBytes(6).toString('hex').toUpperCase(),
    timestamp: new Date().toISOString(),
    responseCode: options.responseCode || '00', // 00 = approved
    responseMessage: options.responseMessage || 'Approved'
  };
}

/**
 * Validate payment amount
 */
function validatePaymentAmount(amount, expectedAmount, tolerance = 0) {
  const diff = Math.abs(amount - expectedAmount);
  return diff <= tolerance;
}

/**
 * Calculate payment expiry time
 */
function calculateExpiry(minutes = 15) {
  return Date.now() + (minutes * 60 * 1000);
}

/**
 * Check if payment is expired
 */
function isPaymentExpired(expiryTime) {
  return Date.now() > expiryTime;
}

/**
 * Generate payment ID
 */
function generatePaymentId(prefix = 'pay') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Mock payment verifier
 */
class MockPaymentVerifier {
  constructor(options = {}) {
    this.failureRate = options.failureRate || 0;
    this.verificationDelay = options.verificationDelay || 0;
  }

  /**
   * Verify blockchain payment
   */
  async verifyBlockchainPayment(txHash, expectedAmount, expectedRecipient) {
    await new Promise(resolve => setTimeout(resolve, this.verificationDelay));

    if (Math.random() < this.failureRate) {
      return { verified: false, error: 'Verification failed' };
    }

    return {
      verified: true,
      transaction: generateMockTransaction({
        hash: txHash,
        to: expectedRecipient,
        value: expectedAmount.toString()
      })
    };
  }

  /**
   * Verify Stripe payment
   */
  async verifyStripePayment(paymentIntentId, expectedAmount) {
    await new Promise(resolve => setTimeout(resolve, this.verificationDelay));

    if (Math.random() < this.failureRate) {
      return { verified: false, error: 'Payment not found' };
    }

    return {
      verified: true,
      payment: generateMockStripePayment({
        id: paymentIntentId,
        amount: expectedAmount
      })
    };
  }

  /**
   * Verify Mastercard payment
   */
  async verifyMastercardPayment(transactionId, expectedAmount) {
    await new Promise(resolve => setTimeout(resolve, this.verificationDelay));

    if (Math.random() < this.failureRate) {
      return { verified: false, error: 'Transaction declined' };
    }

    return {
      verified: true,
      transaction: generateMockMastercardTransaction({
        transactionId,
        amount: expectedAmount
      })
    };
  }
}

/**
 * Payment state machine for testing
 */
class PaymentStateMachine {
  constructor() {
    this.state = 'idle';
    this.history = [];
  }

  transition(newState) {
    this.history.push({ from: this.state, to: newState, timestamp: Date.now() });
    this.state = newState;
  }

  can(action) {
    const validTransitions = {
      idle: ['initiated'],
      initiated: ['pending', 'cancelled'],
      pending: ['processing', 'expired', 'cancelled'],
      processing: ['completed', 'failed'],
      completed: ['idle'],
      failed: ['idle'],
      expired: ['idle'],
      cancelled: ['idle']
    };

    return validTransitions[this.state]?.includes(action) || false;
  }

  getHistory() {
    return this.history;
  }
}

/**
 * Test payment flows
 */
async function testPaymentFlow(config) {
  const {
    protocol, // 'x402', 'ap2', 'acp', 'mastercard'
    amount,
    productId,
    agentId,
    expectedOutcome = 'success' // 'success', 'failure', 'timeout'
  } = config;

  const stateMachine = new PaymentStateMachine();
  const results = {
    protocol,
    success: false,
    steps: [],
    duration: 0,
    state: null
  };

  const startTime = Date.now();

  try {
    // Step 1: Initiate payment
    stateMachine.transition('initiated');
    results.steps.push({ step: 'initiated', timestamp: Date.now() });

    // Step 2: Payment pending
    stateMachine.transition('pending');
    results.steps.push({ step: 'pending', timestamp: Date.now() });

    // Simulate timeout
    if (expectedOutcome === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 16 * 60 * 1000)); // 16 minutes
      stateMachine.transition('expired');
      results.steps.push({ step: 'expired', timestamp: Date.now() });
      throw new Error('Payment expired');
    }

    // Step 3: Process payment
    stateMachine.transition('processing');
    results.steps.push({ step: 'processing', timestamp: Date.now() });

    // Simulate failure
    if (expectedOutcome === 'failure') {
      stateMachine.transition('failed');
      results.steps.push({ step: 'failed', timestamp: Date.now() });
      throw new Error('Payment processing failed');
    }

    // Step 4: Complete payment
    stateMachine.transition('completed');
    results.steps.push({ step: 'completed', timestamp: Date.now() });

    results.success = true;
  } catch (error) {
    results.error = error.message;
  }

  results.duration = Date.now() - startTime;
  results.state = stateMachine.state;
  results.history = stateMachine.getHistory();

  return results;
}

/**
 * Generate test payment data
 */
function generateTestPaymentData(protocol) {
  const baseData = {
    paymentId: generatePaymentId(),
    amount: 1000 + Math.floor(Math.random() * 9000), // 1000-10000
    currency: 'USD',
    timestamp: Date.now(),
    expiresAt: calculateExpiry(15)
  };

  switch (protocol) {
    case 'x402':
      return {
        ...baseData,
        token: 'USDC',
        recipientAddress: '0x' + crypto.randomBytes(20).toString('hex'),
        txHash: null
      };

    case 'ap2':
      return {
        ...baseData,
        verifiableCredential: crypto.randomBytes(32).toString('base64'),
        vendorId: 'vendor-' + crypto.randomBytes(4).toString('hex'),
        auditId: 'audit-' + crypto.randomBytes(8).toString('hex')
      };

    case 'acp':
      return {
        ...baseData,
        stripePaymentIntentId: 'pi_' + crypto.randomBytes(12).toString('hex'),
        fraudScore: Math.floor(Math.random() * 100)
      };

    case 'mastercard':
      return {
        ...baseData,
        cardLast4: String(Math.floor(1000 + Math.random() * 9000)),
        authCode: crypto.randomBytes(6).toString('hex').toUpperCase(),
        merchantId: 'MERCHANT123'
      };

    default:
      return baseData;
  }
}

module.exports = {
  generateMockTransaction,
  generateMockStripePayment,
  generateMockMastercardTransaction,
  validatePaymentAmount,
  calculateExpiry,
  isPaymentExpired,
  generatePaymentId,
  MockPaymentVerifier,
  PaymentStateMachine,
  testPaymentFlow,
  generateTestPaymentData
};
