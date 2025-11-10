# x402 Vending Machine

> 🪙 **HTTP 402 Crypto Micropayments** - The simplest way to monetize APIs with cryptocurrency

A complete digital vending machine implementation using the x402 protocol for instant crypto micropayments. Perfect for AI agents, API monetization, and micropayment use cases.

[![Protocol](https://img.shields.io/badge/Protocol-x402-orange)](https://x402.org)
[![Network](https://img.shields.io/badge/Network-Base-blue)](https://base.org)
[![Settlement](https://img.shields.io/badge/Settlement-2_seconds-brightgreen)](https://base.org)

## 🚀 Quick Start

### 5-Minute Setup
```bash
# 1. Clone and navigate
git clone https://github.com/xpaysh/agentic-economy-boilerplate
cd agentic-economy-boilerplate/x402-vending-machine

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your wallet address

# 4. Start the vending machine
npm start

# 5. Test it out!
curl http://localhost:3000/inventory
curl http://localhost:3000/buy/classic-cola
```

**🎉 You now have a working x402 payment server!**

## 🎯 What This Example Demonstrates

### Core x402 Features
- ✅ **HTTP 402 Status Code** - Proper use of "Payment Required"
- ✅ **Crypto Micropayments** - Payments as low as $0.01
- ✅ **Instant Settlement** - 2-second blockchain confirmation
- ✅ **Multi-Token Support** - USDC, ETH, DAI
- ✅ **Zero Platform Fees** - Direct peer-to-peer payments

### Production-Ready Features
- ✅ **Security** - Rate limiting, input validation, helmet
- ✅ **Monitoring** - Winston logging, analytics endpoint
- ✅ **Error Handling** - Graceful failure modes
- ✅ **Payment Tracking** - Pending/completed payment states
- ✅ **Expiry Management** - Automatic cleanup of expired payments

## 🏗️ How It Works

### 1. Product Request
```bash
curl http://localhost:3000/buy/classic-cola
```

### 2. 402 Response
```http
HTTP/1.1 402 Payment Required
x402-accept: USDC
x402-amount: 0.01
x402-recipient: 0x742d35Cc6634C0532925a3b8D440609653cbe
x402-payment-id: payment_1699123456789_abc123
x402-expiry: 1699123756789

{
  "error": "Payment Required",
  "message": "Please pay 0.01 USDC to purchase Classic Cola",
  "payment_details": {
    "id": "payment_1699123456789_abc123",
    "amount": 0.01,
    "token": "USDC",
    "recipient": "0x742d35Cc6634C0532925a3b8D440609653cbe",
    "network": "base",
    "expires_at": "2023-11-04T18:15:56.789Z"
  }
}
```

### 3. Payment Confirmation
```bash
curl -X POST http://localhost:3000/confirm-payment \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "payment_1699123456789_abc123",
    "transaction_hash": "0x123abc...def789"
  }'
```

### 4. Product Delivery
```json
{
  "success": true,
  "message": "Payment confirmed and product dispensed",
  "payment": {
    "id": "payment_1699123456789_abc123",
    "amount": 0.01,
    "token": "USDC",
    "transaction_hash": "0x123abc...def789"
  },
  "product": {
    "id": "product_1699123456789",
    "name": "Classic Cola",
    "serial_number": "SN1699123456789AB12",
    "activation_code": "ACDF123GH456",
    "expires_at": "2023-11-05T18:15:56.789Z"
  }
}
```

## 🛠️ API Reference

### 🏥 Health Check
```bash
GET /health
```
Returns server status and configuration info.

### 📦 Get Inventory
```bash
GET /inventory
```
Returns available products, prices, and accepted tokens.

### 💰 Purchase Product
```bash
GET /buy/:productId?token=USDC
```
Returns 402 Payment Required with payment details.

**Parameters:**
- `productId`: Product identifier (classic-cola, orange-fizz, etc.)
- `token`: Preferred payment token (optional, defaults to USDC)

### ✅ Confirm Payment
```bash
POST /confirm-payment
Content-Type: application/json

{
  "payment_id": "payment_xxx",
  "transaction_hash": "0x123..."
}
```
Confirms blockchain payment and dispenses product.

### 🔍 Payment Status
```bash
GET /payment/:paymentId/status
```
Check if payment is pending, completed, or expired.

### 📊 Analytics
```bash
GET /analytics
```
View system statistics and inventory status.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NETWORK` | Blockchain network | `base` |
| `RECIPIENT_ADDRESS` | Your wallet address | Required |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |

### Product Configuration
Edit prices in `server.js`:

```javascript
const X402_CONFIG = {
  prices: {
    'classic-cola': 0.01,      // $0.01 USDC
    'orange-fizz': 0.015,      // $0.015 USDC
    'grape-burst': 0.02,       // $0.02 USDC
    'premium-energy': 0.05     // $0.05 USDC
  }
};
```

## 💡 Real-World Use Cases

### API Monetization
```javascript
// Charge per API call
app.get('/api/premium-data', async (req, res) => {
  // Return 402 if no valid payment
  if (!await verifyPayment(req)) {
    return res.status(402)
              .set(generateX402Headers('api-call', 0.001))
              .json({ error: 'Payment required for premium data' });
  }
  
  // Return premium data
  res.json({ data: await getPremiumData() });
});
```

### Content Paywalls
```javascript
// Pay-per-article access
app.get('/article/:id', async (req, res) => {
  const article = await getArticle(req.params.id);
  
  if (article.premium && !await verifyPayment(req)) {
    return res.status(402)
              .set(generateX402Headers('article', 0.05))
              .json({ error: 'Payment required for premium content' });
  }
  
  res.json(article);
});
```

### AI Agent Services
```javascript
// AI model inference payments
app.post('/ai/generate', async (req, res) => {
  if (!await verifyPayment(req)) {
    return res.status(402)
              .set(generateX402Headers('ai-inference', 0.02))
              .json({ error: 'Payment required for AI inference' });
  }
  
  const result = await runAIModel(req.body.prompt);
  res.json({ result });
});
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Manual Testing
```bash
# Test healthy endpoint
curl http://localhost:3000/health

# Test inventory
curl http://localhost:3000/inventory

# Test payment flow
curl http://localhost:3000/buy/classic-cola

# Test with different token
curl "http://localhost:3000/buy/classic-cola?token=ETH"

# Test payment confirmation (use real tx hash)
curl -X POST http://localhost:3000/confirm-payment \
  -H "Content-Type: application/json" \
  -d '{"payment_id":"payment_xxx","transaction_hash":"0x123..."}'
```

## 🔐 Security Best Practices

### Input Validation
```javascript
const Joi = require('joi');

const paymentSchema = Joi.object({
  payment_id: Joi.string().required(),
  transaction_hash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required()
});
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### Payment Expiry
- Payments expire after 5 minutes
- Automatic cleanup prevents memory leaks
- Prevents replay attacks

### Transaction Verification
In production, implement proper blockchain verification:

```javascript
async function verifyTransaction(txHash, expectedAmount, expectedRecipient) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const tx = await provider.getTransaction(txHash);
  
  // Verify transaction details
  if (tx.to !== expectedRecipient) return false;
  if (tx.value.toString() !== expectedAmount) return false;
  
  // Verify transaction is confirmed
  const receipt = await provider.getTransactionReceipt(txHash);
  return receipt && receipt.status === 1;
}
```

## 🚀 Production Deployment

### Environment Setup
```bash
# Production environment
export NODE_ENV=production
export PORT=443
export NETWORK=base
export RECIPIENT_ADDRESS=your_production_wallet
```

### HTTPS Configuration
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

### Database Integration
For production, replace in-memory storage:

```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Store payment in Redis instead of Map
await client.setex(`payment:${paymentId}`, 300, JSON.stringify(paymentData));
```

### Monitoring Setup
```javascript
// Add DataDog integration
const StatsD = require('node-statsd');
const stats = new StatsD();

// Track payments
stats.increment('payments.initiated');
stats.histogram('payments.amount', amount);
```

## 🔗 Integration Examples

### With AI Agents
```javascript
// Claude/ChatGPT integration example
const agentPayment = {
  endpoint: 'http://localhost:3000/buy/classic-cola',
  handlePayment: async (paymentDetails) => {
    // Agent automatically pays using wallet
    const tx = await wallet.sendTransaction({
      to: paymentDetails.recipient,
      value: paymentDetails.amount,
      data: paymentDetails.memo
    });
    
    // Confirm payment
    return await confirmPayment(paymentDetails.id, tx.hash);
  }
};
```

### With Web3 Wallets
```javascript
// MetaMask integration
async function payWithWallet(paymentDetails) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const tx = await signer.sendTransaction({
    to: paymentDetails.recipient,
    value: ethers.parseUnits(paymentDetails.amount.toString(), 6) // USDC has 6 decimals
  });
  
  return tx.hash;
}
```

## 📚 Learning Resources

### x402 Protocol
- [Official x402 Documentation](https://docs.x402.org)
- [x402 Foundation](https://x402.foundation)
- [Coinbase x402 Guide](https://docs.cdp.coinbase.com/x402)

### Related Protocols
- [Awesome x402](https://github.com/xpaysh/awesome-x402) - Deep dive on x402
- [Base Network](https://base.org) - Ethereum L2 for fast, cheap transactions
- [HTTP 402 Specification](https://httpstatuses.com/402) - Original HTTP spec

## 🤝 Contributing

### Adding Features
- New payment tokens
- Database persistence
- Advanced analytics
- Webhook notifications

### Security Improvements
- Enhanced transaction verification
- Multi-signature wallets
- Advanced fraud detection
- Compliance features

### Performance Optimizations
- Caching layers
- Database optimization
- Load balancing
- CDN integration

## 📄 License

MIT License - Use this code in your projects!

---

**🚀 Ready to monetize your APIs with crypto micropayments? This vending machine is your starting point!**

*Next steps: Check out the [AP2 example](../ap2-vending-machine) for enterprise-grade payment authorization.*