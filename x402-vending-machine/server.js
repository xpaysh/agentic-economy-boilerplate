/**
 * x402 Vending Machine
 *
 * HTTP 402 Payment Required implementation for crypto micropayments
 * Now using shared production utilities
 */

require('dotenv').config();
const express = require('express');

// Import shared utilities
let middleware, storage;
try {
  const shared = require('../shared');
  middleware = shared.middleware;
  storage = shared.storage;
} catch (error) {
  console.warn('Shared utilities not available, using built-in alternatives');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize storage
let storageManager;
if (storage) {
  storageManager = storage.createStorage();
} else {
  // Fallback in-memory storage
  storageManager = {
    pendingPayments: new Map(),
    completedPayments: new Set(),
    async initialize() { return this; },
    async savePayment(id, data) { this.pendingPayments.set(id, data); },
    async getPayment(id) { return this.pendingPayments.get(id); },
    async deletePayment(id) { this.pendingPayments.delete(id); },
    async listPayments() { return Array.from(this.pendingPayments.keys()); },
    async exists(id) { return this.pendingPayments.has(id) || this.completedPayments.has(id); }
  };
}

// Get logger
const logger = middleware ? middleware.logger : console;

// x402 Configuration
const X402_CONFIG = {
  acceptedTokens: ['USDC', 'ETH', 'DAI'],
  network: process.env.NETWORK || 'base',
  recipientAddress: process.env.RECIPIENT_ADDRESS || '0x742d35Cc6634C0532925a3b8D440609653cbe',
  prices: {
    'classic-cola': 0.01, // 1 cent in USDC
    'orange-fizz': 0.015,
    'grape-burst': 0.02,
    'premium-energy': 0.05
  }
};

// Vending machine inventory
const inventory = {
  'classic-cola': { name: 'Classic Cola', stock: 100, description: 'Refreshing classic taste' },
  'orange-fizz': { name: 'Orange Fizz', stock: 75, description: 'Zesty orange flavor' },
  'grape-burst': { name: 'Grape Burst', stock: 50, description: 'Explosive grape goodness' },
  'premium-energy': { name: 'Premium Energy', stock: 25, description: 'High-caffeine energy boost' }
};

// Middleware setup
app.use(express.json());

if (middleware) {
  // Use shared middleware
  app.use(middleware.security.requestId);
  app.use(middleware.security.configureHelmet());
  app.use(middleware.security.configureCORS());
  app.use(middleware.security.sanitizeInput);
  app.use(middleware.agentDetection.agentMiddleware({ logActivity: true }));
  app.use(middleware.rateLimiter.createRateLimiter());
} else {
  // Basic fallback middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
}

// Utility functions
function generatePaymentId() {
  return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateX402Headers(productId, token = 'USDC') {
  const price = X402_CONFIG.prices[productId];
  if (!price) {
    throw new Error('Product not found');
  }

  return {
    'x402-accept': token,
    'x402-amount': price.toString(),
    'x402-recipient': X402_CONFIG.recipientAddress,
    'x402-memo': `Purchase: ${inventory[productId].name}`,
    'x402-network': X402_CONFIG.network
  };
}

function generateActivationCode() {
  return Math.random().toString(36).substr(2, 12).toUpperCase();
}

function simulateTransactionVerification(txHash, paymentDetails) {
  // In a real implementation, this would query the blockchain
  // For demo purposes, accept any transaction hash that looks valid
  return txHash && txHash.length >= 32 && txHash.startsWith('0x');
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    protocol: 'x402',
    storage: storage ? 'shared-storage' : 'in-memory'
  });
});

// Get inventory
app.get('/inventory', (req, res) => {
  const publicInventory = Object.entries(inventory).map(([id, item]) => ({
    id,
    name: item.name,
    description: item.description,
    price: X402_CONFIG.prices[id],
    inStock: item.stock > 0,
    currency: 'USDC'
  }));

  logger.info('Inventory requested', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    itemsAvailable: publicInventory.length,
    agentId: req.agentId,
    agentType: req.agentType
  });

  res.json({
    items: publicInventory,
    accepted_tokens: X402_CONFIG.acceptedTokens,
    network: X402_CONFIG.network
  });
});

// Purchase endpoint - Returns 402 Payment Required
app.get('/buy/:productId', async (req, res) => {
  const { productId } = req.params;
  const preferredToken = req.query.token || 'USDC';

  try {
    // Validate product exists and is in stock
    if (!inventory[productId]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (inventory[productId].stock <= 0) {
      return res.status(410).json({ error: 'Product out of stock' });
    }

    // Validate token is accepted
    if (!X402_CONFIG.acceptedTokens.includes(preferredToken)) {
      return res.status(400).json({
        error: 'Token not accepted',
        accepted_tokens: X402_CONFIG.acceptedTokens
      });
    }

    // Generate payment ID and store payment intent
    const paymentId = generatePaymentId();
    const paymentData = {
      productId,
      token: preferredToken,
      amount: X402_CONFIG.prices[productId],
      timestamp: Date.now(),
      ip: req.ip,
      agentId: req.agentId,
      agentType: req.agentType,
      status: 'pending'
    };

    await storageManager.savePayment(paymentId, paymentData);

    // Generate x402 headers
    const x402Headers = generateX402Headers(productId, preferredToken);

    // Add payment tracking
    x402Headers['x402-payment-id'] = paymentId;
    x402Headers['x402-expiry'] = (Date.now() + 300000).toString(); // 5 minutes

    logger.info('Payment required', {
      paymentId,
      productId,
      amount: X402_CONFIG.prices[productId],
      token: preferredToken,
      ip: req.ip,
      agentId: req.agentId
    });

    // Return 402 Payment Required with x402 headers
    res.status(402)
       .set(x402Headers)
       .json({
         error: 'Payment Required',
         message: `Please pay ${X402_CONFIG.prices[productId]} ${preferredToken} to purchase ${inventory[productId].name}`,
         payment_details: {
           id: paymentId,
           amount: X402_CONFIG.prices[productId],
           token: preferredToken,
           recipient: X402_CONFIG.recipientAddress,
           network: X402_CONFIG.network,
           expires_at: new Date(Date.now() + 300000).toISOString()
         }
       });

  } catch (error) {
    logger.error('Purchase error', { error: error.message, productId, ip: req.ip });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Payment confirmation endpoint
app.post('/confirm-payment', async (req, res) => {
  const { payment_id, transaction_hash, signature } = req.body;

  try {
    // Validate required fields
    if (!payment_id || !transaction_hash) {
      return res.status(400).json({ error: 'Missing required fields: payment_id, transaction_hash' });
    }

    // Check if payment exists and is pending
    const paymentDetails = await storageManager.getPayment(payment_id);
    if (!paymentDetails) {
      return res.status(404).json({ error: 'Payment not found or expired' });
    }

    // Check if payment already completed
    if (paymentDetails.status === 'completed') {
      return res.status(409).json({ error: 'Payment already processed' });
    }

    // Check if payment expired
    const isExpired = Date.now() - paymentDetails.timestamp > 300000; // 5 minutes
    if (isExpired) {
      paymentDetails.status = 'expired';
      await storageManager.savePayment(payment_id, paymentDetails);
      return res.status(408).json({ error: 'Payment expired' });
    }

    // Verify the transaction
    const isValidTransaction = simulateTransactionVerification(transaction_hash, paymentDetails);

    if (!isValidTransaction) {
      logger.warn('Invalid transaction', { payment_id, transaction_hash, ip: req.ip });
      return res.status(400).json({ error: 'Transaction verification failed' });
    }

    // Process the purchase
    const product = inventory[paymentDetails.productId];
    product.stock -= 1;

    // Mark payment as completed
    paymentDetails.status = 'completed';
    paymentDetails.transaction_hash = transaction_hash;
    paymentDetails.completed_at = Date.now();
    await storageManager.savePayment(payment_id, paymentDetails);

    // Generate digital product (simulated)
    const digitalProduct = {
      id: `product_${Date.now()}`,
      name: product.name,
      description: product.description,
      serial_number: `SN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      activation_code: generateActivationCode(),
      expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      transaction_hash
    };

    logger.info('Purchase completed', {
      payment_id,
      productId: paymentDetails.productId,
      transaction_hash,
      ip: req.ip,
      agentId: paymentDetails.agentId
    });

    res.json({
      success: true,
      message: 'Payment confirmed and product dispensed',
      payment: {
        id: payment_id,
        amount: paymentDetails.amount,
        token: paymentDetails.token,
        transaction_hash
      },
      product: digitalProduct,
      dispensed_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Payment confirmation error', { error: error.message, payment_id, ip: req.ip });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment status
app.get('/payment/:paymentId/status', async (req, res) => {
  const { paymentId } = req.params;

  try {
    const payment = await storageManager.getPayment(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      res.json({
        status: 'completed',
        transaction_hash: payment.transaction_hash,
        completed_at: payment.completed_at
      });
    } else if (payment.status === 'pending') {
      const isExpired = Date.now() - payment.timestamp > 300000; // 5 minutes

      if (isExpired) {
        payment.status = 'expired';
        await storageManager.savePayment(paymentId, payment);
        res.json({ status: 'expired' });
      } else {
        res.json({
          status: 'pending',
          expires_in: Math.max(0, 300000 - (Date.now() - payment.timestamp))
        });
      }
    } else {
      res.json({ status: payment.status });
    }
  } catch (error) {
    logger.error('Payment status error', { error: error.message, paymentId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics endpoint
app.get('/analytics', async (req, res) => {
  try {
    const paymentKeys = await storageManager.listPayments();
    let pendingCount = 0;
    let completedCount = 0;

    for (const key of paymentKeys) {
      const payment = await storageManager.getPayment(key.replace('payment:', ''));
      if (payment) {
        if (payment.status === 'completed') completedCount++;
        else if (payment.status === 'pending') pendingCount++;
      }
    }

    const stats = {
      total_payments_pending: pendingCount,
      total_payments_completed: completedCount,
      inventory_status: Object.entries(inventory).map(([id, item]) => ({
        product: id,
        stock: item.stock,
        sold: 100 - item.stock
      })),
      supported_networks: [X402_CONFIG.network],
      accepted_tokens: X402_CONFIG.acceptedTokens,
      storage_type: storage ? 'redis-backed' : 'in-memory'
    };

    res.json(stats);
  } catch (error) {
    logger.error('Analytics error', { error: error.message });
    res.status(500).json({ error: 'Analytics unavailable' });
  }
});

// Error handling
if (middleware) {
  app.use(middleware.errorHandler.notFoundHandler);
  app.use(middleware.errorHandler.errorHandler);
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
}

// Cleanup expired payments periodically
setInterval(async () => {
  try {
    const paymentKeys = await storageManager.listPayments();
    const now = Date.now();

    for (const key of paymentKeys) {
      const paymentId = key.replace('payment:', '');
      const payment = await storageManager.getPayment(paymentId);

      if (payment && payment.status === 'pending' && (now - payment.timestamp > 300000)) {
        payment.status = 'expired';
        await storageManager.savePayment(paymentId, payment);
        logger.info('Expired payment cleaned up', { paymentId });
      }
    }
  } catch (error) {
    logger.error('Cleanup error', { error: error.message });
  }
}, 60000); // Run every minute

// Start server
async function startServer() {
  try {
    // Initialize storage
    await storageManager.initialize();
    logger.info('✓ Storage initialized');

    app.listen(PORT, () => {
      logger.info(`\n🚀 x402 Vending Machine started on port ${PORT}`);
      logger.info('📍 Endpoints available:');
      logger.info(`   GET  /health - Health check`);
      logger.info(`   GET  /inventory - View available products`);
      logger.info(`   GET  /buy/:productId - Purchase product (returns 402)`);
      logger.info(`   POST /confirm-payment - Confirm blockchain payment`);
      logger.info(`   GET  /payment/:id/status - Check payment status`);
      logger.info(`   GET  /analytics - View system analytics`);
      logger.info('');
      logger.info('🔗 Try it out:');
      logger.info(`   curl http://localhost:${PORT}/inventory`);
      logger.info(`   curl http://localhost:${PORT}/buy/classic-cola`);
      logger.info('');
      logger.info('💰 Supported tokens:', X402_CONFIG.acceptedTokens.join(', '));
      logger.info('🌐 Network:', X402_CONFIG.network);
      logger.info('📍 Recipient:', X402_CONFIG.recipientAddress);
      logger.info(`📦 Storage: ${storage ? 'Shared storage (Redis/in-memory)' : 'Built-in in-memory'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  if (storageManager.close) {
    await storageManager.close();
  }
  process.exit(0);
});

startServer();

module.exports = app;
