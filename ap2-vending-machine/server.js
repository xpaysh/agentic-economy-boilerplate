/**
 * Google Agent Payments Protocol (AP2) Vending Machine
 * 
 * Demonstrates enterprise agent authorization with Verifiable Credentials
 * and multi-rail payment processing (traditional + crypto via x402)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const jose = require('node-jose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'ap2-vending.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock enterprise identity provider
const enterpriseAgents = {
  'urn:agent:enterprise:procurement-001': {
    name: 'Enterprise Procurement Agent',
    organization: 'TechCorp Inc',
    capabilities: ['payment_authorization', 'vendor_negotiation', 'compliance_check'],
    max_amount: 10000,
    authorized_vendors: ['coffee_corp', 'office_supplies_inc']
  },
  'urn:agent:enterprise:finance-001': {
    name: 'Finance Operations Agent', 
    organization: 'TechCorp Inc',
    capabilities: ['payment_processing', 'invoice_management'],
    max_amount: 50000,
    authorized_vendors: ['*'] // All vendors
  }
};

// AP2 Authorization middleware
async function validateAP2Authorization(req, res, next) {
  try {
    const authHeader = req.headers['ap2-authorization'];
    if (!authHeader) {
      return res.status(401).json({
        error: 'AP2_AUTH_REQUIRED',
        message: 'AP2 authorization header required',
        required_format: 'Bearer {verifiable_credential_jwt}'
      });
    }

    const [scheme, credential] = authHeader.split(' ');
    if (scheme !== 'Bearer') {
      return res.status(401).json({
        error: 'INVALID_AUTH_SCHEME',
        message: 'Authorization scheme must be Bearer'
      });
    }

    // Verify Verifiable Credential (simplified for demo)
    const decoded = jwt.decode(credential);
    if (!decoded || !decoded.sub || !enterpriseAgents[decoded.sub]) {
      return res.status(403).json({
        error: 'INVALID_AGENT_CREDENTIAL', 
        message: 'Agent not authorized for enterprise operations'
      });
    }

    req.agent = {
      id: decoded.sub,
      ...enterpriseAgents[decoded.sub],
      credential: decoded
    };

    logger.info('AP2 authorization validated', { 
      agent_id: req.agent.id,
      organization: req.agent.organization 
    });

    next();
  } catch (error) {
    logger.error('AP2 authorization failed', { error: error.message });
    res.status(401).json({
      error: 'AUTH_VALIDATION_FAILED',
      message: 'Unable to validate agent credentials'
    });
  }
}

// Products catalog with enterprise pricing
const enterpriseProducts = {
  premium_coffee: {
    name: 'Premium Office Coffee',
    price: 25.00,
    currency: 'USD',
    vendor: 'coffee_corp',
    description: 'Enterprise-grade coffee for your office',
    compliance_required: false
  },
  office_supplies: {
    name: 'Office Supply Package',
    price: 150.00, 
    currency: 'USD',
    vendor: 'office_supplies_inc',
    description: 'Complete office supply package',
    compliance_required: true
  },
  software_license: {
    name: 'Enterprise Software License',
    price: 5000.00,
    currency: 'USD', 
    vendor: 'software_corp',
    description: 'Annual enterprise software license',
    compliance_required: true
  }
};

// AP2 Product catalog endpoint
app.get('/ap2/catalog', validateAP2Authorization, (req, res) => {
  const { agent } = req;
  
  // Filter products based on agent authorization
  const authorizedProducts = Object.entries(enterpriseProducts)
    .filter(([key, product]) => {
      // Check vendor authorization
      if (!agent.authorized_vendors.includes('*') && 
          !agent.authorized_vendors.includes(product.vendor)) {
        return false;
      }
      
      // Check amount limits
      if (product.price > agent.max_amount) {
        return false;
      }
      
      return true;
    })
    .reduce((acc, [key, product]) => {
      acc[key] = product;
      return acc;
    }, {});

  logger.info('Catalog accessed', { 
    agent_id: agent.id, 
    products_count: Object.keys(authorizedProducts).length 
  });

  res.json({
    ap2_version: '2.0',
    agent_id: agent.id,
    organization: agent.organization,
    products: authorizedProducts,
    payment_rails: {
      traditional: ['mastercard', 'visa', 'corporate_card'],
      crypto: {
        protocol: 'x402',
        chains: ['ethereum', 'base'],
        tokens: ['USDC', 'PYUSD']
      }
    }
  });
});

// AP2 Purchase endpoint with multi-rail payment
app.post('/ap2/purchase', validateAP2Authorization, async (req, res) => {
  try {
    const { agent } = req;
    const { product_id, quantity = 1, payment_method, purchase_order } = req.body;

    if (!product_id || !enterpriseProducts[product_id]) {
      return res.status(404).json({
        error: 'PRODUCT_NOT_FOUND',
        message: 'Product not available'
      });
    }

    const product = enterpriseProducts[product_id];
    const total_amount = product.price * quantity;

    // Validate agent authorization for this purchase
    if (!agent.authorized_vendors.includes('*') && 
        !agent.authorized_vendors.includes(product.vendor)) {
      return res.status(403).json({
        error: 'VENDOR_NOT_AUTHORIZED',
        message: 'Agent not authorized for this vendor'
      });
    }

    if (total_amount > agent.max_amount) {
      return res.status(403).json({
        error: 'AMOUNT_EXCEEDS_LIMIT',
        message: `Amount exceeds agent limit of $${agent.max_amount}`
      });
    }

    // Process payment based on rail
    let payment_result;
    if (payment_method?.rail === 'crypto' && payment_method?.protocol === 'x402') {
      // Crypto payment via x402
      payment_result = await processX402Payment({
        amount: total_amount,
        currency: payment_method.token || 'USDC',
        chain: payment_method.chain || 'base',
        payment_proof: payment_method.payment_proof
      });
    } else {
      // Traditional payment processing
      payment_result = await processTraditionalPayment({
        amount: total_amount,
        currency: product.currency,
        payment_method: payment_method?.card_type || 'corporate_card',
        purchase_order
      });
    }

    if (!payment_result.success) {
      return res.status(402).json({
        error: 'PAYMENT_FAILED',
        message: payment_result.error,
        payment_rails: {
          traditional: ['mastercard', 'visa', 'corporate_card'],
          crypto: { protocol: 'x402', chains: ['ethereum', 'base'] }
        }
      });
    }

    // Generate purchase record with audit trail
    const purchase_id = `ap2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const audit_trail = {
      timestamp: new Date().toISOString(),
      agent_id: agent.id,
      organization: agent.organization,
      product_id,
      quantity,
      total_amount,
      payment_rail: payment_method?.rail || 'traditional',
      payment_id: payment_result.payment_id,
      compliance_check: product.compliance_required ? 'PASSED' : 'NOT_REQUIRED'
    };

    logger.info('AP2 purchase completed', audit_trail);

    res.json({
      success: true,
      purchase_id,
      product: {
        name: product.name,
        quantity,
        unit_price: product.price,
        total_amount
      },
      payment: {
        rail: payment_method?.rail || 'traditional',
        payment_id: payment_result.payment_id,
        status: 'completed'
      },
      delivery: {
        estimated: '2-3 business days',
        tracking: `AP2-${purchase_id}`
      },
      audit_trail
    });

  } catch (error) {
    logger.error('AP2 purchase failed', { 
      error: error.message,
      agent_id: req.agent?.id 
    });
    
    res.status(500).json({
      error: 'PURCHASE_PROCESSING_ERROR',
      message: 'Unable to process purchase'
    });
  }
});

// Mock payment processors
async function processX402Payment({ amount, currency, chain, payment_proof }) {
  // Simulate x402 payment verification
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    payment_id: `x402_${chain}_${Date.now()}`,
    transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
    block_number: Math.floor(Math.random() * 1000000) + 18000000
  };
}

async function processTraditionalPayment({ amount, currency, payment_method, purchase_order }) {
  // Simulate traditional payment processing
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    success: true,
    payment_id: `${payment_method}_${Date.now()}`,
    authorization_code: Math.random().toString(36).substr(2, 8).toUpperCase(),
    reference: purchase_order || `REF-${Date.now()}`
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    protocol: 'AP2 v2.0',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`AP2 Vending Machine running on port ${PORT}`);
  console.log(`\n🏢 AP2 Enterprise Vending Machine`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📋 Catalog: GET /ap2/catalog (requires AP2 auth)`);
  console.log(`💳 Purchase: POST /ap2/purchase (requires AP2 auth)`);
  console.log(`🔒 Protocol: Google Agent Payments Protocol (AP2) v2.0`);
  console.log(`\n📖 Authentication: Include 'AP2-Authorization: Bearer {VC_JWT}' header`);
});