/**
 * Mastercard Agent Pay Vending Machine
 *
 * Demonstrates traditional card payment processing for AI agents using
 * Mastercard's Agent Pay protocol.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');

// Import shared utilities
let middleware, storage;
try {
  const shared = require('../shared');
  middleware = shared.middleware;
  storage = shared.storage;
} catch (error) {
  console.warn('Shared utilities not available, using built-in alternatives');
}

const MastercardService = require('./services/mastercard-service');
const productCatalog = require('./config/products');

const app = express();
const PORT = process.env.MASTERCARD_PORT || 3003;

// Initialize storage
let storageManager;
if (storage) {
  storageManager = storage.createStorage();
} else {
  // Fallback in-memory storage
  storageManager = {
    payments: new Map(),
    sessions: new Map(),
    async initialize() { return this; },
    async savePayment(id, data) { this.payments.set(id, data); },
    async getPayment(id) { return this.payments.get(id); },
    async deletePayment(id) { this.payments.delete(id); },
    async saveSession(id, data) { this.sessions.set(id, data); },
    async getSession(id) { return this.sessions.get(id); },
    async deleteSession(id) { this.sessions.delete(id); }
  };
}

// Initialize Mastercard service
const mastercardService = new MastercardService({
  apiKey: process.env.MASTERCARD_API_KEY,
  clientId: process.env.MASTERCARD_CLIENT_ID,
  clientSecret: process.env.MASTERCARD_CLIENT_SECRET,
  environment: process.env.MASTERCARD_ENVIRONMENT || 'sandbox',
  apiUrl: process.env.MASTERCARD_API_URL
});

// Middleware
app.use(express.json());

if (middleware) {
  // Use shared middleware if available
  app.use(middleware.security.requestId);
  app.use(middleware.security.configureCORS());
  app.use(middleware.security.sanitizeInput);
  app.use(middleware.agentDetection.agentMiddleware({ logActivity: true }));
  app.use(middleware.rateLimiter.createRateLimiter());
} else {
  // Basic CORS fallback
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-ID');
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mastercard-vending-machine',
    timestamp: new Date().toISOString()
  });
});

// Get product catalog
app.get('/api/products', (req, res) => {
  res.json({
    products: productCatalog,
    paymentMethods: ['credit_card', 'debit_card', 'mastercard_digital_wallet'],
    currency: 'USD'
  });
});

// Get product details
app.get('/api/products/:productId', (req, res) => {
  const product = productCatalog.find(p => p.id === req.params.productId);

  if (!product) {
    return res.status(404).json({
      error: 'Product not found'
    });
  }

  res.json(product);
});

// Initiate purchase and payment
app.post('/api/purchase', async (req, res) => {
  try {
    const { productId, agentId, paymentMethod = 'credit_card' } = req.body;

    // Validate product
    const product = productCatalog.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    if (!product.inStock) {
      return res.status(400).json({
        error: 'Product out of stock'
      });
    }

    // Check agent authorization (if enabled)
    const enableAgentAuth = process.env.MASTERCARD_ENABLE_AGENT_AUTH === 'true';
    if (enableAgentAuth && agentId) {
      const authorizedAgents = (process.env.MASTERCARD_AUTHORIZED_AGENTS || '').split(',');
      if (authorizedAgents.length > 0 && !authorizedAgents.includes(agentId)) {
        return res.status(403).json({
          error: 'Agent not authorized for Mastercard payments'
        });
      }
    }

    // Create payment session
    const paymentSession = await mastercardService.createPaymentSession({
      amount: product.price,
      currency: 'USD',
      productId: product.id,
      productName: product.name,
      agentId: agentId || req.agentId || 'anonymous',
      paymentMethod,
      metadata: {
        vendingMachine: 'mastercard',
        timestamp: Date.now()
      }
    });

    // Save payment session
    await storageManager.savePayment(paymentSession.paymentId, {
      ...paymentSession,
      product,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
    });

    res.status(202).json({
      message: 'Payment session created',
      paymentId: paymentSession.paymentId,
      amount: product.price,
      currency: 'USD',
      product: {
        id: product.id,
        name: product.name
      },
      paymentSession: {
        sessionId: paymentSession.sessionId,
        merchantId: paymentSession.merchantId,
        authorizationEndpoint: paymentSession.authorizationEndpoint
      },
      expiresAt: paymentSession.expiresAt,
      instructions: 'Complete payment using the Mastercard payment session'
    });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({
      error: 'Failed to create payment session',
      message: error.message
    });
  }
});

// Process payment with card details
app.post('/api/payments/:paymentId/process', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { cardDetails, billingAddress } = req.body;

    // Get payment session
    const payment = await storageManager.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        error: 'Payment session not found'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        error: 'Payment already processed',
        status: payment.status
      });
    }

    // Check expiry
    if (Date.now() > payment.expiresAt) {
      payment.status = 'expired';
      await storageManager.savePayment(paymentId, payment);

      return res.status(408).json({
        error: 'Payment session expired'
      });
    }

    // Process payment with Mastercard
    const result = await mastercardService.processPayment({
      paymentId,
      sessionId: payment.sessionId,
      amount: payment.amount,
      currency: 'USD',
      cardDetails,
      billingAddress,
      metadata: payment.metadata
    });

    // Update payment status
    payment.status = result.status;
    payment.transactionId = result.transactionId;
    payment.authorizationCode = result.authorizationCode;
    payment.processedAt = Date.now();
    payment.mastercardResponse = result;

    await storageManager.savePayment(paymentId, payment);

    if (result.status === 'approved') {
      res.json({
        success: true,
        message: 'Payment approved',
        transactionId: result.transactionId,
        authorizationCode: result.authorizationCode,
        product: payment.product,
        receipt: {
          paymentId,
          amount: payment.amount,
          currency: 'USD',
          cardLast4: result.cardLast4,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(402).json({
        success: false,
        error: 'Payment declined',
        reason: result.responseMessage,
        transactionId: result.transactionId
      });
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      error: 'Payment processing failed',
      message: error.message
    });
  }
});

// Get payment status
app.get('/api/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await storageManager.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    res.json({
      paymentId,
      status: payment.status,
      amount: payment.amount,
      currency: 'USD',
      product: payment.product,
      transactionId: payment.transactionId,
      authorizationCode: payment.authorizationCode,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      expiresAt: payment.expiresAt
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      message: error.message
    });
  }
});

// Webhook endpoint for Mastercard callbacks
app.post('/api/webhooks/mastercard', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-mastercard-signature'];
    const isValid = mastercardService.verifyWebhookSignature(req.body, signature);

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid webhook signature'
      });
    }

    const event = JSON.parse(req.body.toString());

    console.log('Mastercard webhook received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment.authorized':
        await handlePaymentAuthorized(event.data);
        break;
      case 'payment.declined':
        await handlePaymentDeclined(event.data);
        break;
      case 'payment.refunded':
        await handlePaymentRefunded(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed'
    });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    // In production, this would query a database
    res.json({
      message: 'Analytics endpoint - implement with database queries',
      note: 'This would show transaction volumes, success rates, etc.'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Analytics unavailable'
    });
  }
});

// Webhook handlers
async function handlePaymentAuthorized(data) {
  const { paymentId, transactionId } = data;

  const payment = await storageManager.getPayment(paymentId);
  if (payment) {
    payment.status = 'approved';
    payment.transactionId = transactionId;
    payment.processedAt = Date.now();
    await storageManager.savePayment(paymentId, payment);

    console.log(`Payment ${paymentId} authorized via webhook`);
  }
}

async function handlePaymentDeclined(data) {
  const { paymentId, reason } = data;

  const payment = await storageManager.getPayment(paymentId);
  if (payment) {
    payment.status = 'declined';
    payment.declineReason = reason;
    payment.processedAt = Date.now();
    await storageManager.savePayment(paymentId, payment);

    console.log(`Payment ${paymentId} declined via webhook:`, reason);
  }
}

async function handlePaymentRefunded(data) {
  const { paymentId, refundId, amount } = data;

  const payment = await storageManager.getPayment(paymentId);
  if (payment) {
    payment.status = 'refunded';
    payment.refundId = refundId;
    payment.refundedAmount = amount;
    payment.refundedAt = Date.now();
    await storageManager.savePayment(paymentId, payment);

    console.log(`Payment ${paymentId} refunded via webhook`);
  }
}

// Error handling
if (middleware) {
  app.use(middleware.errorHandler.notFoundHandler);
  app.use(middleware.errorHandler.errorHandler);
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
}

// Start server
async function startServer() {
  try {
    // Initialize storage
    await storageManager.initialize();
    console.log('✓ Storage initialized');

    app.listen(PORT, () => {
      console.log(`\n🏪 Mastercard Vending Machine running on port ${PORT}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log(`📦 Products: http://localhost:${PORT}/api/products`);
      console.log(`💳 Mastercard Agent Pay protocol enabled`);
      console.log(`\nEnvironment: ${process.env.MASTERCARD_ENVIRONMENT || 'sandbox'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (storageManager.close) {
    await storageManager.close();
  }
  process.exit(0);
});

startServer();

module.exports = app;
