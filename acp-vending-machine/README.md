# ACP Consumer Vending Machine

OpenAI Agentic Commerce Protocol (ACP) implementation with Stripe integration, demonstrating consumer AI commerce with fraud prevention and conversational purchase experiences.

## 🤖 What is ACP?

ACP (Agentic Commerce Protocol) is OpenAI's standard for consumer AI commerce, featuring:
- **ChatGPT checkout integration** for conversational shopping
- **Stripe-powered payments** with fraud prevention
- **AI agent optimization** with smart recommendations
- **Millions of transactions** processed through ChatGPT

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your Stripe keys

# Start the ACP vending machine
npm start
```

Server runs on `http://localhost:3003`

## 🔑 Stripe Setup

1. **Create Stripe Account**: [dashboard.stripe.com](https://dashboard.stripe.com)

2. **Get API Keys**: Copy from Stripe Dashboard → Developers → API keys

3. **Create Products & Prices**:
```bash
# Create products in Stripe Dashboard or via API
stripe products create --name "AI Assistant Premium" --description "Advanced AI assistant with GPT-4 access"
stripe prices create --unit-amount 2000 --currency usd --product {product_id} --recurring-interval month
```

4. **Configure Webhook**:
   - Endpoint: `https://your-domain.com/acp/webhooks/stripe`
   - Events: `checkout.session.completed`

## 🤖 Authentication

ACP supports multiple authentication methods for AI agents:

### Method 1: Bearer Token
```bash
curl -H "ACP-Authorization: Bearer agent_token_123" \
     http://localhost:3003/acp/products
```

### Method 2: AI Agent User-Agent
```bash
curl -H "User-Agent: ChatGPT/1.0 (OpenAI Agent)" \
     http://localhost:3003/acp/products
```

### Method 3: No Auth (Consumer Mode)
```bash
# Higher fraud score, basic features only
curl http://localhost:3003/acp/products
```

## 📱 API Endpoints

### GET /acp/products
Discover products with AI recommendations.

**Query Parameters:**
- `category`: Filter by product category
- `ai_recommended`: Show only AI-recommended products (true/false)

**Response:**
```json
{
  "acp_version": "1.0",
  "agent_id": "acp_agent123",
  "agent_type": "authenticated",
  "products": {
    "ai_assistant_premium": {
      "name": "AI Assistant Premium",
      "price": 20.00,
      "currency": "usd",
      "description": "Advanced AI assistant with GPT-4 access",
      "category": "digital_service",
      "features": ["GPT-4 access", "100 queries/day", "Priority support"],
      "ai_recommended": true
    }
  },
  "ai_recommendations": {
    "popular_with_ai": ["ai_assistant_premium", "data_insights"],
    "suggested_bundles": [
      {
        "name": "AI Developer Bundle",
        "products": ["ai_assistant_premium", "data_insights"],
        "discount": 0.15
      }
    ],
    "next_actions": [
      "Try premium AI features first",
      "Consider bundle deals for better value"
    ]
  },
  "payment_methods": ["stripe_checkout", "apple_pay", "google_pay"],
  "fraud_protection": true
}
```

### POST /acp/checkout
Create Stripe checkout session for AI agent purchases.

**Headers:**
```
ACP-Authorization: Bearer {token} (optional)
Content-Type: application/json
```

**Body:**
```json
{
  "product_ids": ["ai_assistant_premium", "data_insights"],
  "quantities": {
    "ai_assistant_premium": 1,
    "data_insights": 2
  },
  "customer_info": {
    "email": "agent@example.com"
  }
}
```

**Response:**
```json
{
  "checkout_session_id": "cs_test_123...",
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_123...",
  "expires_at": 1699123456,
  "payment_status": "pending",
  "fraud_check": {
    "score": 25,
    "status": "approved",
    "enhanced_security": false
  }
}
```

### GET /acp/orders/:session_id
Check order status and payment completion.

**Response:**
```json
{
  "order_id": "cs_test_123...",
  "status": "complete",
  "payment_status": "paid",
  "amount_total": 11999,
  "currency": "usd",
  "created": 1699123456,
  "expires_at": null
}
```

## 🛡️ Fraud Prevention

ACP includes built-in fraud detection:

### Risk Factors
- **High amount purchases** (>$500)
- **No agent verification** (missing auth headers)
- **Suspicious patterns** (rapid repeated requests)
- **IP reputation** checks

### Fraud Responses
- **Score 0-50**: Normal processing
- **Score 51-75**: Enhanced security (3D Secure)
- **Score 76-90**: Manual review required
- **Score 91+**: Transaction blocked

### Security Features
```json
{
  "fraud_check": {
    "score": 75,
    "status": "review", 
    "enhanced_security": true,
    "risk_factors": ["HIGH_AMOUNT", "NO_AGENT_VERIFICATION"]
  }
}
```

## 💳 Payment Processing

### Stripe Integration
```javascript
// Automatic Stripe checkout creation
const session = await stripe.checkout.sessions.create({
  line_items: products.map(p => ({
    price: p.stripe_price_id,
    quantity: p.quantity
  })),
  mode: 'payment',
  success_url: `${domain}/success`,
  cancel_url: `${domain}/cancel`,
  metadata: {
    agent_id: agent.id,
    acp_version: '1.0'
  }
});
```

### Payment Methods Supported
- **Credit/Debit Cards** (Visa, Mastercard, Amex)
- **Apple Pay** (mobile/web)
- **Google Pay** (mobile/web) 
- **Digital Wallets** (Link, etc.)

## 🧪 Testing

### Test with curl:
```bash
# 1. Get products
curl -H "User-Agent: ChatGPT/1.0" http://localhost:3003/acp/products

# 2. Create checkout
curl -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: ChatGPT/1.0" \
  -d '{"product_ids": ["ai_assistant_premium"]}' \
  http://localhost:3003/acp/checkout

# 3. Check order status
curl -H "User-Agent: ChatGPT/1.0" \
  http://localhost:3003/acp/orders/cs_test_123...
```

### Test Stripe Integration:
```bash
# Use Stripe CLI to test webhooks
stripe listen --forward-to localhost:3003/acp/webhooks/stripe

# Test payments with test cards
# 4242424242424242 - Visa success
# 4000000000000002 - Visa declined
# 4000002500003155 - Visa with 3D Secure
```

## 🎯 AI Agent Optimization

### ChatGPT Integration
```javascript
// Optimized for ChatGPT shopping experiences
{
  "ai_recommendations": {
    "popular_with_ai": ["ai_assistant_premium"],
    "conversation_starters": [
      "What AI tools would help with my work?",
      "Show me the most popular AI services"
    ],
    "quick_actions": [
      "Buy recommended bundle",
      "Start free trial",
      "Compare plans"
    ]
  }
}
```

### Agent-Specific Features
- **Bulk pricing** for agent purchases
- **API integration guides** for agent developers
- **Usage analytics** for optimization
- **Smart recommendations** based on agent patterns

## 🔧 Production Deployment

### Environment Variables
```bash
# Required
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DOMAIN=https://your-production-domain.com

# Optional
OPENAI_API_KEY=sk-... # For enhanced AI detection
FRAUD_DETECTION_ENABLED=true
```

### Security Checklist
- [ ] Use HTTPS in production
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Enable Stripe webhook signature verification
- [ ] Set up monitoring and alerting
- [ ] Configure backup payment processors

### Monitoring
```bash
# Key metrics to monitor
- Checkout conversion rate
- Fraud score distribution  
- Payment success rate
- Average order value
- AI agent vs human purchases
```

## 🔗 Integration Examples

### With OpenAI GPT Models
```python
import openai
import requests

# Agent discovers products
products = requests.get(
  "https://your-domain.com/acp/products",
  headers={"User-Agent": "ChatGPT/1.0"}
).json()

# AI recommends products to user
recommendation = openai.chat.completions.create(
  model="gpt-4",
  messages=[{
    "role": "system",
    "content": f"Help user choose from these products: {products}"
  }]
)
```

### With Anthropic Claude
```javascript
// Claude MCP integration
import { MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient({
  tools: [{
    name: 'acp_purchase',
    description: 'Purchase products via ACP',
    endpoint: 'https://your-domain.com/acp/checkout'
  }]
});
```

## 📚 Resources

- **[OpenAI ACP Documentation](https://developers.openai.com/commerce/)**
- **[Stripe Checkout Documentation](https://stripe.com/docs/checkout)**
- **[ChatGPT Plugin Development](https://platform.openai.com/docs/plugins)**
- **[x402 Integration Guide](../x402-vending-machine/)**

## 🤝 Contributing

This is part of the [Awesome Agentic Economy](https://github.com/xpaysh/awesome-agentic-economy) boilerplate collection. Contributions welcome!

## 📄 License

MIT - see [LICENSE](../LICENSE) for details.