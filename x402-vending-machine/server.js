const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logging configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json());

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

// In-memory payment tracking (use Redis in production)
const pendingPayments = new Map();
const completedPayments = new Set();

// Vending machine inventory
const inventory = {
  'classic-cola': { name: 'Classic Cola', stock: 100, description: 'Refreshing classic taste' },
  'orange-fizz': { name: 'Orange Fizz', stock: 75, description: 'Zesty orange flavor' },
  'grape-burst': { name: 'Grape Burst', stock: 50, description: 'Explosive grape goodness' },
  'premium-energy': { name: 'Premium Energy', stock: 25, description: 'High-caffeine energy boost' }
};

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

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    protocol: 'x402'
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
    itemsAvailable: publicInventory.length
  });

  res.json({
    items: publicInventory,
    accepted_tokens: X402_CONFIG.acceptedTokens,
    network: X402_CONFIG.network
  });
});

// Purchase endpoint - Returns 402 Payment Required
app.get('/buy/:productId', (req, res) => {
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
    pendingPayments.set(paymentId, {
      productId,
      token: preferredToken,
      amount: X402_CONFIG.prices[productId],
      timestamp: Date.now(),
      ip: req.ip
    });

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
      ip: req.ip 
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
app.post('/confirm-payment', (req, res) => {
  const { payment_id, transaction_hash, signature } = req.body;

  try {
    // Validate required fields
    if (!payment_id || !transaction_hash) {
      return res.status(400).json({ error: 'Missing required fields: payment_id, transaction_hash' });
    }

    // Check if payment exists and is pending
    const paymentDetails = pendingPayments.get(payment_id);
    if (!paymentDetails) {
      return res.status(404).json({ error: 'Payment not found or expired' });
    }

    // Check if payment already completed
    if (completedPayments.has(payment_id)) {
      return res.status(409).json({ error: 'Payment already processed' });
    }

    // In a real implementation, verify the transaction on-chain
    // For this demo, we'll simulate verification
    const isValidTransaction = simulateTransactionVerification(transaction_hash, paymentDetails);
    
    if (!isValidTransaction) {
      logger.warn('Invalid transaction', { payment_id, transaction_hash, ip: req.ip });
      return res.status(400).json({ error: 'Transaction verification failed' });
    }

    // Process the purchase
    const product = inventory[paymentDetails.productId];
    product.stock -= 1;

    // Mark payment as completed
    completedPayments.add(payment_id);
    pendingPayments.delete(payment_id);

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
      ip: req.ip 
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
app.get('/payment/:paymentId/status', (req, res) => {
  const { paymentId } = req.params;

  if (completedPayments.has(paymentId)) {
    res.json({ status: 'completed' });
  } else if (pendingPayments.has(paymentId)) {
    const payment = pendingPayments.get(paymentId);
    const isExpired = Date.now() - payment.timestamp > 300000; // 5 minutes
    
    if (isExpired) {
      pendingPayments.delete(paymentId);
      res.json({ status: 'expired' });
    } else {
      res.json({ 
        status: 'pending',
        expires_in: Math.max(0, 300000 - (Date.now() - payment.timestamp))
      });
    }
  } else {
    res.status(404).json({ error: 'Payment not found' });
  }
});

// Analytics endpoint
app.get('/analytics', (req, res) => {
  const stats = {
    total_payments_pending: pendingPayments.size,
    total_payments_completed: completedPayments.size,
    inventory_status: Object.entries(inventory).map(([id, item]) => ({
      product: id,
      stock: item.stock,
      sold: 100 - item.stock // Assuming starting stock was 100
    })),
    supported_networks: [X402_CONFIG.network],
    accepted_tokens: X402_CONFIG.acceptedTokens
  };

  res.json(stats);
});

// Helper functions
function simulateTransactionVerification(txHash, paymentDetails) {
  // In a real implementation, this would:
  // 1. Query the blockchain for the transaction
  // 2. Verify the recipient address matches
  // 3. Verify the amount is correct
  // 4. Verify the token is correct
  // 5. Ensure the transaction is confirmed
  
  // For demo purposes, we'll accept any transaction hash that looks valid
  return txHash && txHash.length >= 32 && txHash.startsWith('0x');
}

function generateActivationCode() {
  return Math.random().toString(36).substr(2, 12).toUpperCase();
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    error: error.message, 
    stack: error.stack, 
    ip: req.ip,
    path: req.path 
  });
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method, ip: req.ip });
  res.status(404).json({ error: 'Route not found' });
});

// Cleanup expired payments periodically
setInterval(() => {
  const now = Date.now();
  for (const [paymentId, payment] of pendingPayments.entries()) {
    if (now - payment.timestamp > 300000) { // 5 minutes
      pendingPayments.delete(paymentId);
      logger.info('Expired payment cleaned up', { paymentId });
    }
  }
}, 60000); // Run every minute

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 x402 Vending Machine started on port ${PORT}`);
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
});

module.exports = app;