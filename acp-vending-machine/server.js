/**
 * OpenAI Agentic Commerce Protocol (ACP) Vending Machine
 * 
 * Demonstrates consumer AI commerce with Stripe checkout integration,
 * fraud prevention, and conversational purchase experience.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'acp-vending.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Consumer products catalog
const consumerProducts = {
  ai_assistant_premium: {
    name: 'AI Assistant Premium',
    price: 20.00,
    currency: 'usd',
    description: 'Advanced AI assistant with GPT-4 access',
    stripe_price_id: process.env.STRIPE_PRICE_AI_PREMIUM,
    category: 'digital_service',
    features: ['GPT-4 access', '100 queries/day', 'Priority support'],
    ai_recommended: true
  },
  productivity_suite: {
    name: 'AI Productivity Suite',
    price: 49.99,
    currency: 'usd', 
    description: 'Complete AI-powered productivity tools',
    stripe_price_id: process.env.STRIPE_PRICE_PRODUCTIVITY,
    category: 'software',
    features: ['Document AI', 'Schedule optimization', 'Email drafting'],
    ai_recommended: false
  },
  data_insights: {
    name: 'AI Data Insights',
    price: 99.99,
    currency: 'usd',
    description: 'Advanced data analysis and insights',
    stripe_price_id: process.env.STRIPE_PRICE_DATA_INSIGHTS,
    category: 'analytics',
    features: ['Custom dashboards', 'Predictive analytics', 'API access'],
    ai_recommended: true
  },
  voice_synthesis: {
    name: 'AI Voice Synthesis',
    price: 15.00,
    currency: 'usd',
    description: 'High-quality AI voice generation service',
    stripe_price_id: process.env.STRIPE_PRICE_VOICE,
    category: 'digital_service',
    features: ['Multiple voices', '1000 characters/month', 'Commercial use'],
    ai_recommended: false
  }
};

// ACP Authentication middleware (simplified for demo)
function validateACPAuth(req, res, next) {
  const authHeader = req.headers['acp-authorization'];
  const userAgent = req.headers['user-agent'];
  
  // Check for AI agent patterns
  const isAIAgent = userAgent && (
    userAgent.includes('OpenAI') || 
    userAgent.includes('GPT') ||
    userAgent.includes('ChatGPT') ||
    userAgent.includes('claude') ||
    userAgent.includes('agent')
  );

  if (!authHeader && !isAIAgent) {
    return res.status(401).json({
      error: 'ACP_AUTH_REQUIRED',
      message: 'ACP authorization required for agent transactions',
      auth_methods: ['bearer_token', 'ai_agent_header']
    });
  }

  // Extract agent info
  let agent_id = 'consumer_agent';
  let agent_type = 'individual';

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    // In production, validate the token properly
    agent_id = `acp_${token.substr(0, 8)}`;
    agent_type = 'authenticated';
  }

  req.agent = {
    id: agent_id,
    type: agent_type,
    is_ai_agent: isAIAgent,
    user_agent: userAgent
  };

  next();
}

// ACP fraud detection middleware
function fraudDetection(req, res, next) {
  const { agent } = req;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Basic fraud checks
  const riskFactors = [];
  
  // Check for suspicious patterns
  if (req.body.purchase_amount && req.body.purchase_amount > 500) {
    riskFactors.push('HIGH_AMOUNT');
  }
  
  if (!agent.is_ai_agent && !req.headers['acp-authorization']) {
    riskFactors.push('NO_AGENT_VERIFICATION');
  }

  // Rate limiting check
  const sessionId = req.headers['acp-session-id'] || agent.id;
  // In production, implement proper rate limiting storage
  
  req.fraud_score = riskFactors.length * 25; // Simple scoring
  req.risk_factors = riskFactors;
  
  if (req.fraud_score > 75) {
    logger.warn('High fraud risk detected', {
      agent_id: agent.id,
      fraud_score: req.fraud_score,
      risk_factors: riskFactors,
      ip: clientIP
    });
  }

  next();
}

// ACP Product discovery with AI recommendations
app.get('/acp/products', validateACPAuth, (req, res) => {
  const { agent } = req;
  const { category, ai_recommended } = req.query;
  
  let products = { ...consumerProducts };
  
  // Filter by category if specified
  if (category) {
    products = Object.entries(products)
      .filter(([key, product]) => product.category === category)
      .reduce((acc, [key, product]) => {
        acc[key] = product;
        return acc;
      }, {});
  }
  
  // Filter by AI recommendation if specified
  if (ai_recommended === 'true') {
    products = Object.entries(products)
      .filter(([key, product]) => product.ai_recommended)
      .reduce((acc, [key, product]) => {
        acc[key] = product;
        return acc;
      }, {});
  }

  // Add AI-specific metadata
  const response = {
    acp_version: '1.0',
    agent_id: agent.id,
    agent_type: agent.type,
    products,
    ai_recommendations: agent.is_ai_agent ? generateAIRecommendations(products) : null,
    payment_methods: ['stripe_checkout', 'apple_pay', 'google_pay'],
    fraud_protection: true
  };

  logger.info('ACP product discovery', {
    agent_id: agent.id,
    category,
    ai_recommended,
    product_count: Object.keys(products).length
  });

  res.json(response);
});

// Generate AI-specific product recommendations
function generateAIRecommendations(products) {
  return {
    popular_with_ai: ['ai_assistant_premium', 'data_insights'],
    suggested_bundles: [
      {
        name: 'AI Developer Bundle',
        products: ['ai_assistant_premium', 'data_insights'],
        discount: 0.15
      }
    ],
    next_actions: [
      'Try premium AI features first',
      'Consider bundle deals for better value',
      'Check integration compatibility'
    ]
  };
}

// ACP Checkout creation
app.post('/acp/checkout', validateACPAuth, fraudDetection, async (req, res) => {
  try {
    const { agent } = req;
    const { product_ids, quantities = {}, customer_info = {} } = req.body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({
        error: 'INVALID_PRODUCTS',
        message: 'Product IDs array is required'
      });
    }

    // Validate all products exist
    for (const product_id of product_ids) {
      if (!consumerProducts[product_id]) {
        return res.status(404).json({
          error: 'PRODUCT_NOT_FOUND',
          message: `Product ${product_id} not available`
        });
      }
    }

    // Check fraud score
    if (req.fraud_score > 90) {
      return res.status(403).json({
        error: 'FRAUD_RISK_HIGH',
        message: 'Transaction blocked due to fraud risk',
        contact_support: true
      });
    }

    // Calculate totals
    const line_items = product_ids.map(product_id => {
      const product = consumerProducts[product_id];
      const quantity = quantities[product_id] || 1;
      
      return {
        price: product.stripe_price_id || 'price_default', // Fallback
        quantity,
        adjustable_quantity: {
          enabled: true,
          minimum: 1,
          maximum: 10
        }
      };
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: 'payment',
      success_url: `${process.env.DOMAIN}/acp/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/acp/cancel`,
      customer_email: customer_info.email,
      metadata: {
        agent_id: agent.id,
        agent_type: agent.type,
        fraud_score: req.fraud_score.toString(),
        acp_session: uuidv4()
      },
      payment_intent_data: {
        metadata: {
          agent_purchase: 'true',
          acp_version: '1.0'
        }
      },
      // Enable fraud prevention
      payment_method_options: {
        card: {
          request_three_d_secure: req.fraud_score > 50 ? 'automatic' : 'any'
        }
      }
    });

    logger.info('ACP checkout created', {
      agent_id: agent.id,
      session_id: session.id,
      product_count: product_ids.length,
      fraud_score: req.fraud_score
    });

    res.json({
      checkout_session_id: session.id,
      checkout_url: session.url,
      expires_at: session.expires_at,
      payment_status: 'pending',
      fraud_check: {
        score: req.fraud_score,
        status: req.fraud_score > 75 ? 'review' : 'approved',
        enhanced_security: req.fraud_score > 50
      }
    });

  } catch (error) {
    logger.error('ACP checkout creation failed', {
      error: error.message,
      agent_id: req.agent?.id
    });

    res.status(500).json({
      error: 'CHECKOUT_CREATION_FAILED',
      message: 'Unable to create checkout session',
      retry: true
    });
  }
});

// ACP Payment completion webhook
app.post('/acp/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    logger.info('ACP payment completed', {
      session_id: session.id,
      agent_id: session.metadata.agent_id,
      amount: session.amount_total,
      currency: session.currency
    });

    // Process fulfillment for digital products
    await fulfillAcpOrder(session);
  }

  res.json({ received: true });
});

// Process digital product fulfillment
async function fulfillAcpOrder(session) {
  try {
    // Retrieve line items to see what was purchased
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    
    for (const item of lineItems.data) {
      // Map back to products and activate services
      logger.info('Fulfilling ACP order item', {
        session_id: session.id,
        price_id: item.price.id,
        quantity: item.quantity
      });
      
      // In production: activate user accounts, send license keys, etc.
    }
  } catch (error) {
    logger.error('ACP fulfillment failed', {
      session_id: session.id,
      error: error.message
    });
  }
}

// ACP Order status
app.get('/acp/orders/:session_id', validateACPAuth, async (req, res) => {
  try {
    const { session_id } = req.params;
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.metadata.agent_id !== req.agent.id) {
      return res.status(403).json({
        error: 'ORDER_ACCESS_DENIED',
        message: 'Order belongs to different agent'
      });
    }

    res.json({
      order_id: session_id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      created: session.created,
      expires_at: session.expires_at
    });

  } catch (error) {
    logger.error('ACP order lookup failed', {
      session_id: req.params.session_id,
      error: error.message
    });

    res.status(404).json({
      error: 'ORDER_NOT_FOUND',
      message: 'Order not found or inaccessible'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    protocol: 'ACP v1.0 (OpenAI + Stripe)',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`ACP Vending Machine running on port ${PORT}`);
  console.log(`\n🤖 ACP Consumer Vending Machine`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🛍️ Products: GET /acp/products`);
  console.log(`💳 Checkout: POST /acp/checkout`);
  console.log(`📦 Orders: GET /acp/orders/:session_id`);
  console.log(`🔒 Protocol: OpenAI Agentic Commerce Protocol (ACP) + Stripe`);
  console.log(`\n📖 Authentication: Include 'ACP-Authorization: Bearer {token}' header or use AI agent User-Agent`);
});