# Mastercard Agent Pay Vending Machine

A digital vending machine that accepts traditional card payments using Mastercard's Agent Pay protocol, designed specifically for AI agents making autonomous purchases.

## Overview

This vending machine demonstrates how AI agents can use traditional payment methods (credit/debit cards) through Mastercard's Agent Pay system. Unlike crypto-based solutions, this bridges AI agents with established financial infrastructure.

## Features

- **Traditional Card Payments**: Accept Visa, Mastercard, Amex, Discover
- **Agent Authorization**: Optional whitelist of authorized agent IDs
- **Payment Sessions**: Secure 15-minute payment windows
- **Webhook Support**: Real-time payment notifications
- **Mock Mode**: Test without real Mastercard API credentials
- **Production Ready**: Uses shared utilities for storage, logging, and security

## Quick Start

### 1. Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Mastercard credentials
```

### 2. Configuration

Get your Mastercard API credentials from [Mastercard Developer Portal](https://developer.mastercard.com/):

```env
MASTERCARD_API_KEY=your_api_key_here
MASTERCARD_CLIENT_ID=your_client_id_here
MASTERCARD_CLIENT_SECRET=your_client_secret_here
MASTERCARD_ENVIRONMENT=sandbox
```

### 3. Run

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3003`

## API Endpoints

### Get Products

```bash
GET /api/products
```

**Response:**
```json
{
  "products": [
    {
      "id": "coffee",
      "name": "Coffee",
      "price": 500,
      "currency": "USD",
      "inStock": true
    }
  ],
  "paymentMethods": ["credit_card", "debit_card", "mastercard_digital_wallet"],
  "currency": "USD"
}
```

### Create Purchase

```bash
POST /api/purchase
Content-Type: application/json

{
  "productId": "coffee",
  "agentId": "corporate-agent-001",
  "paymentMethod": "credit_card"
}
```

**Response:**
```json
{
  "message": "Payment session created",
  "paymentId": "mc_pay_...",
  "amount": 500,
  "currency": "USD",
  "product": {
    "id": "coffee",
    "name": "Coffee"
  },
  "paymentSession": {
    "sessionId": "mc_sess_...",
    "merchantId": "VENDING_MERCHANT_001",
    "authorizationEndpoint": "https://sandbox.api.mastercard.com/agent-pay/v1/authorize"
  },
  "expiresAt": 1234567890,
  "instructions": "Complete payment using the Mastercard payment session"
}
```

### Process Payment

```bash
POST /api/payments/:paymentId/process
Content-Type: application/json

{
  "cardDetails": {
    "number": "5555555555554444",
    "expMonth": "12",
    "expYear": "2030",
    "cvc": "123",
    "holderName": "AI Agent"
  },
  "billingAddress": {
    "line1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94102",
    "country": "US"
  }
}
```

**Response (Approved):**
```json
{
  "success": true,
  "message": "Payment approved",
  "transactionId": "MC1234567890",
  "authorizationCode": "ABC123",
  "product": {
    "id": "coffee",
    "name": "Coffee"
  },
  "receipt": {
    "paymentId": "mc_pay_...",
    "amount": 500,
    "currency": "USD",
    "cardLast4": "4444",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response (Declined):**
```json
{
  "success": false,
  "error": "Payment declined",
  "reason": "Do not honor",
  "transactionId": "MC1234567890"
}
```

### Get Payment Status

```bash
GET /api/payments/:paymentId
```

**Response:**
```json
{
  "paymentId": "mc_pay_...",
  "status": "approved",
  "amount": 500,
  "currency": "USD",
  "product": {
    "id": "coffee",
    "name": "Coffee"
  },
  "transactionId": "MC1234567890",
  "authorizationCode": "ABC123",
  "createdAt": 1234567890,
  "processedAt": 1234567900,
  "expiresAt": 1234568790
}
```

## Agent Integration

### Example: AI Agent Making a Purchase

```javascript
const axios = require('axios');

async function buyFromVendingMachine() {
  const baseUrl = 'http://localhost:3003';

  // Step 1: Browse products
  const products = await axios.get(`${baseUrl}/api/products`);
  console.log('Available products:', products.data);

  // Step 2: Create purchase
  const purchase = await axios.post(`${baseUrl}/api/purchase`, {
    productId: 'coffee',
    agentId: 'my-agent-001',
    paymentMethod: 'credit_card'
  });

  const { paymentId } = purchase.data;
  console.log('Payment session created:', paymentId);

  // Step 3: Process payment
  const payment = await axios.post(
    `${baseUrl}/api/payments/${paymentId}/process`,
    {
      cardDetails: {
        number: '5555555555554444',
        expMonth: '12',
        expYear: '2030',
        cvc: '123',
        holderName: 'AI Agent'
      },
      billingAddress: {
        line1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US'
      }
    }
  );

  if (payment.data.success) {
    console.log('Payment approved!');
    console.log('Transaction ID:', payment.data.transactionId);
    console.log('Product:', payment.data.product);
  } else {
    console.log('Payment declined:', payment.data.reason);
  }
}

buyFromVendingMachine();
```

## Test Cards

Use these test card numbers in sandbox mode:

### Approved Cards
- **Mastercard**: `5555555555554444`
- **Visa**: `4242424242424242`

### Declined Cards
- **Do Not Honor**: `4000000000000002`
- **Insufficient Funds**: `5555555555555557`

**Expiry**: Any future date (e.g., 12/2030)
**CVC**: Any 3 digits (e.g., 123)

## Agent Authorization

Enable agent authorization to restrict which agents can use the vending machine:

```env
MASTERCARD_ENABLE_AGENT_AUTH=true
MASTERCARD_AUTHORIZED_AGENTS=corporate-agent-001,finance-bot-002
```

Unauthorized agents will receive a 403 Forbidden response.

## Webhooks

Setup webhooks to receive real-time payment notifications:

### Webhook Endpoint

```
POST /api/webhooks/mastercard
```

### Event Types

- `payment.authorized`: Payment successfully authorized
- `payment.declined`: Payment was declined
- `payment.refunded`: Payment was refunded

### Webhook Signature Verification

Webhooks are signed with your `MASTERCARD_CLIENT_SECRET`. The signature is included in the `X-Mastercard-Signature` header.

## Production Deployment

### 1. Environment Configuration

```env
NODE_ENV=production
MASTERCARD_ENVIRONMENT=production
MASTERCARD_API_URL=https://api.mastercard.com
MOCK_PAYMENTS=false
USE_REDIS=true
REDIS_URL=redis://your-redis-host:6379
```

### 2. Use Real Credentials

Replace sandbox credentials with production ones from Mastercard.

### 3. Enable HTTPS

Use a reverse proxy (nginx, Caddy) or load balancer with SSL certificates.

### 4. Setup Monitoring

Monitor payment success rates, response times, and error rates.

## Docker Deployment

### Using Docker Compose

```bash
# From repository root
docker-compose up mastercard-vending
```

### Standalone Docker

```bash
# Build image
docker build -t mastercard-vending .

# Run container
docker run -p 3003:3003 \
  -e MASTERCARD_API_KEY=your_key \
  -e MASTERCARD_CLIENT_ID=your_id \
  -e MASTERCARD_CLIENT_SECRET=your_secret \
  mastercard-vending
```

## Architecture

```
┌─────────────┐
│  AI Agent   │
└──────┬──────┘
       │ 1. Request product
       │ 2. Create payment session
       │ 3. Process payment
       ▼
┌─────────────────────────┐
│ Mastercard Vending      │
│ Machine (Express API)   │
├─────────────────────────┤
│ - Product Catalog       │
│ - Payment Sessions      │
│ - Webhook Handlers      │
└────────┬────────────────┘
         │
         │ Mastercard API calls
         ▼
┌─────────────────────────┐
│ Mastercard Agent Pay    │
│ API                     │
├─────────────────────────┤
│ - Authorization         │
│ - Payment Processing    │
│ - Settlement            │
└─────────────────────────┘
```

## Shared Utilities

This vending machine uses shared utilities from `../shared/`:

- **Storage**: Redis/in-memory storage with automatic fallback
- **Middleware**: Rate limiting, agent detection, error handling
- **Testing**: Mock agents, payment helpers, fixtures
- **Security**: Helmet, CORS, input sanitization

See `../shared/README.md` for details.

## Troubleshooting

### "Failed to create payment session"
- Check your Mastercard API credentials
- Verify `MASTERCARD_ENVIRONMENT` matches your credentials
- Set `MOCK_PAYMENTS=true` to test without real API

### "Agent not authorized"
- Ensure agent ID is in `MASTERCARD_AUTHORIZED_AGENTS` list
- Or set `MASTERCARD_ENABLE_AGENT_AUTH=false` to disable checks

### "Payment declined"
- Check if using a test card that simulates declines
- Verify card details are correct
- Check Mastercard dashboard for more details

## Resources

- [Mastercard Developer Portal](https://developer.mastercard.com/)
- [Agent Pay API Documentation](https://developer.mastercard.com/agent-pay/documentation)
- [Mastercard Test Cards](https://developer.mastercard.com/test-cards)
- [Shared Utilities Documentation](../shared/README.md)

## License

MIT
