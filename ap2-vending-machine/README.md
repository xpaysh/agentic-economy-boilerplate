# AP2 Enterprise Vending Machine

Google Agent Payments Protocol (AP2) implementation demonstrating enterprise agent authorization with Verifiable Credentials and multi-rail payment processing.

## 🏢 What is AP2?

AP2 (Agent Payments Protocol) is Google's enterprise standard for autonomous agent payments, featuring:
- **Verifiable Credentials** for agent identity and authorization
- **Multi-rail payments** (traditional finance + crypto via x402)
- **Enterprise compliance** with audit trails and approval workflows
- **60+ launch partners** including Mastercard, PayPal, Salesforce

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start the AP2 vending machine
npm start
```

Server runs on `http://localhost:3002`

## 🔐 Authentication

AP2 uses Verifiable Credentials for agent authorization:

```bash
# Include AP2 authorization header
curl -H "AP2-Authorization: Bearer {verifiable_credential_jwt}" \
     http://localhost:3002/ap2/catalog
```

### Demo Agent Credentials

Two enterprise agents are pre-configured for testing:

#### Procurement Agent
```javascript
{
  "agent_id": "urn:agent:enterprise:procurement-001",
  "organization": "TechCorp Inc", 
  "max_amount": 10000,
  "authorized_vendors": ["coffee_corp", "office_supplies_inc"]
}
```

#### Finance Agent
```javascript
{
  "agent_id": "urn:agent:enterprise:finance-001",
  "organization": "TechCorp Inc",
  "max_amount": 50000,
  "authorized_vendors": ["*"] // All vendors
}
```

## 📋 API Endpoints

### GET /ap2/catalog
Get authorized product catalog for the authenticated agent.

**Headers:**
```
AP2-Authorization: Bearer {verifiable_credential_jwt}
```

**Response:**
```json
{
  "ap2_version": "2.0",
  "agent_id": "urn:agent:enterprise:procurement-001",
  "organization": "TechCorp Inc",
  "products": {
    "premium_coffee": {
      "name": "Premium Office Coffee",
      "price": 25.00,
      "currency": "USD",
      "vendor": "coffee_corp"
    }
  },
  "payment_rails": {
    "traditional": ["mastercard", "visa", "corporate_card"],
    "crypto": {
      "protocol": "x402",
      "chains": ["ethereum", "base"],
      "tokens": ["USDC", "PYUSD"]
    }
  }
}
```

### POST /ap2/purchase
Purchase products using traditional or crypto payment rails.

**Headers:**
```
AP2-Authorization: Bearer {verifiable_credential_jwt}
Content-Type: application/json
```

**Traditional Payment:**
```json
{
  "product_id": "premium_coffee",
  "quantity": 5,
  "payment_method": {
    "rail": "traditional",
    "card_type": "corporate_card"
  },
  "purchase_order": "PO-2025-001"
}
```

**Crypto Payment (via x402):**
```json
{
  "product_id": "premium_coffee", 
  "quantity": 5,
  "payment_method": {
    "rail": "crypto",
    "protocol": "x402",
    "chain": "base",
    "token": "USDC",
    "payment_proof": "0x..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "purchase_id": "ap2-1699123456789-abc123def",
  "product": {
    "name": "Premium Office Coffee",
    "quantity": 5,
    "unit_price": 25.00,
    "total_amount": 125.00
  },
  "payment": {
    "rail": "traditional",
    "payment_id": "corporate_card_1699123456789",
    "status": "completed"
  },
  "delivery": {
    "estimated": "2-3 business days",
    "tracking": "AP2-ap2-1699123456789-abc123def"
  },
  "audit_trail": {
    "timestamp": "2025-11-10T15:30:45.123Z",
    "agent_id": "urn:agent:enterprise:procurement-001",
    "organization": "TechCorp Inc",
    "compliance_check": "NOT_REQUIRED"
  }
}
```

## 🔗 Integration with x402

This AP2 implementation supports crypto payments via the x402 protocol:

```javascript
// Enable crypto payments in your agent
const payment = {
  rail: "crypto",
  protocol: "x402", 
  chain: "base",
  token: "USDC",
  payment_proof: await generateX402Payment(amount)
};
```

## 🛡️ Enterprise Features

### Authorization & Compliance
- **Agent limits** based on role and organization
- **Vendor authorization** lists for procurement control  
- **Compliance checks** for regulated purchases
- **Audit trails** for all transactions

### Multi-Rail Payments
- **Traditional rails**: Mastercard, Visa, corporate cards
- **Crypto rails**: x402 protocol on Ethereum and Base
- **Automatic routing** based on amount and preferences

### Error Handling
- Detailed error codes for agent troubleshooting
- Rate limiting and security controls
- Comprehensive logging for enterprise monitoring

## 🧪 Testing

Generate test Verifiable Credentials:

```javascript
// Simple JWT for testing (use proper VC libraries in production)
const jwt = require('jsonwebtoken');

const testCredential = jwt.sign({
  sub: 'urn:agent:enterprise:procurement-001',
  iss: 'did:web:identity.techcorp.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
}, 'test-secret');

console.log('Test Credential:', testCredential);
```

Test the API:

```bash
# Get catalog
curl -H "AP2-Authorization: Bearer {test_credential}" \
     http://localhost:3002/ap2/catalog

# Make purchase  
curl -X POST \
     -H "AP2-Authorization: Bearer {test_credential}" \
     -H "Content-Type: application/json" \
     -d '{"product_id": "premium_coffee", "quantity": 2}' \
     http://localhost:3002/ap2/purchase
```

## 🔧 Production Considerations

### Security
- Use proper Verifiable Credential libraries (did-jwt, etc.)
- Implement rate limiting and DDoS protection
- Secure key management for payment processing
- Enable HTTPS and security headers

### Compliance
- Integrate with enterprise identity providers
- Implement proper audit logging
- Add approval workflows for large purchases
- Connect to compliance monitoring systems

### Scalability
- Use proper database for product catalog and transactions
- Implement caching for frequently accessed data
- Add monitoring and alerting for payment failures
- Consider load balancing for high volume

## 📚 Resources

- **[Google AP2 Documentation](https://a2a-protocol.org/latest/)**
- **[Verifiable Credentials Spec](https://w3c.github.io/vc-data-model/)**
- **[x402 Protocol Integration](../x402-vending-machine/)**
- **[Enterprise Identity Patterns](https://github.com/xpaysh/awesome-agentic-economy/blob/main/protocols/identity-trust.md)**

## 🤝 Contributing

This is part of the [Awesome Agentic Economy](https://github.com/xpaysh/awesome-agentic-economy) boilerplate collection. Contributions welcome!

## 📄 License

MIT - see [LICENSE](../LICENSE) for details.