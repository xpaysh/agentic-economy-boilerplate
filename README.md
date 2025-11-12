# Agentic Economy Boilerplate

> 🚀 **The Rosetta Stone for Agentic Payments** - One vending machine, 7 protocol implementations + production utilities

Get from zero to working agentic payments in 5 minutes with our battle-tested boilerplate examples.

[![Main Repository](https://img.shields.io/badge/📚_Main_Repo-awesome--agentic--economy-blue)](https://github.com/xpaysh/awesome-agentic-economy)
![Protocols](https://img.shields.io/badge/Protocols-4_Working+3_Planned-brightgreen)
![Setup Time](https://img.shields.io/badge/Setup_Time-5_minutes-orange)
![Production Ready](https://img.shields.io/badge/Production-Utilities_Included-success)

## 🎯 Quick Start

### 🔥 The 5-Minute Challenge
Pick any protocol and get a working payment agent running:

```bash
# Clone this repository
git clone https://github.com/xpaysh/agentic-economy-boilerplate
cd agentic-economy-boilerplate

# Choose your adventure:
cd x402-vending-machine && npm install && npm start          # Crypto micropayments ✅
cd ap2-vending-machine && npm install && npm start           # Enterprise authorization ✅
cd acp-vending-machine && npm install && npm start           # Consumer checkout ✅
cd mastercard-vending-machine && npm install && npm start    # TradFi integration ✅

# Your vending machine is now live! 🎉
```

### 🐳 Or Use Docker

```bash
# Start all vending machines + Redis with one command
docker-compose up

# Or start individual services
docker-compose up x402-vending
docker-compose up mastercard-vending

# For development (just Redis + Redis Commander)
docker-compose -f docker-compose.dev.yml up
```

## ✨ What's New

### 🎁 Production-Ready Shared Utilities

All vending machines now have access to enterprise-grade utilities:

- **📦 Storage Layer**: Redis with automatic in-memory fallback
- **🛡️ Security Suite**: Rate limiting, agent detection, input sanitization
- **🧪 Testing Framework**: Mock agents, payment helpers, comprehensive fixtures
- **🐳 Docker Infrastructure**: Production & development compose files
- **📊 Middleware**: Logging, error handling, CORS, Helmet

**See [`shared/`](./shared/) for complete documentation on all utilities.**

## 🏗️ What You'll Build

Each example implements the same **Digital Vending Machine** that:
- ✅ Accepts payments via different protocols
- ✅ Dispenses digital products (JSON responses)
- ✅ Handles errors gracefully
- ✅ Includes security best practices
- ✅ Provides detailed logging
- ✅ **NEW**: Uses production-ready shared utilities

**The Power**: Compare protocols side-by-side with identical functionality.

## 📦 Available Implementations

### ✅ x402 Vending Machine
**Protocol**: Coinbase x402
**Best For**: Crypto micropayments, AI agent APIs
**Features**: HTTP 402 status code, instant settlement, zero fees
**Status**: ✅ Production Ready (with shared utilities)

```bash
cd x402-vending-machine
curl http://localhost:3000/inventory
curl http://localhost:3000/buy/classic-cola
# Returns: 402 Payment Required with x402 headers
```

[Full Documentation](./x402-vending-machine/README.md)

### ✅ AP2 Vending Machine
**Protocol**: Google Agent Payments Protocol (AP2)
**Best For**: Enterprise workflows, auditable payments
**Features**: Verifiable credentials, mandate-based authorization, audit trails
**Status**: ✅ Working (can be upgraded with shared utilities)

```bash
cd ap2-vending-machine
npm start
# Accepts AP2 credentials and multi-rail payments
```

[Full Documentation](./ap2-vending-machine/README.md)

### ✅ ACP Vending Machine
**Protocol**: OpenAI Agentic Commerce Protocol (ACP)
**Best For**: Consumer AI commerce, chat interfaces
**Features**: Stripe integration, fraud prevention, AI agent detection
**Status**: ✅ Working (can be upgraded with shared utilities)

```bash
cd acp-vending-machine
npm start
# Provides ChatGPT-style checkout experience
```

[Full Documentation](./acp-vending-machine/README.md)

### ✅ Mastercard Vending Machine
**Protocol**: Mastercard Agent Pay
**Best For**: Traditional finance integration, global card payments
**Features**: Card processing (Visa/MC/Amex), agent authorization, webhooks
**Status**: ✅ Production Ready (with shared utilities)

```bash
cd mastercard-vending-machine
npm install && npm start
# Processes card payments for AI agents
```

**Key Features:**
- Traditional card payment processing (Visa, Mastercard, Amex, Discover)
- Payment sessions with 15-minute expiry
- Agent authorization whitelist
- Webhook support for real-time notifications
- Mock mode for development
- Full Mastercard API integration

[Full Documentation](./mastercard-vending-machine/README.md)

### 🚧 Coming Soon

#### Pay3 Vending Machine
**Protocol**: Pay3 Stablecoin Protocol
**Best For**: DeFi integration, cross-chain payments
**Status**: 📋 Planned

#### Hybrid Examples
**Multi-Protocol Smart Agents**
**Status**: 📋 Planned

See how advanced agents switch between protocols:
- `amount < $1` → x402 (micropayments)
- `enterprise + audit_required` → AP2 (compliance)
- `chat_context + consumer` → ACP (UX)
- `cross_border + cards` → Mastercard (global reach)

## 🛠️ Project Structure

```
agentic-economy-boilerplate/
├── shared/                            # 🎁 NEW: Production-ready utilities
│   ├── storage/                       #   Redis + in-memory storage
│   ├── middleware/                    #   Rate limiting, agent detection, security
│   ├── testing/                       #   Mock agents, fixtures, test helpers
│   └── docker/                        #   Dockerfile templates
├── x402-vending-machine/              # ✅ HTTP 402 crypto payments
├── ap2-vending-machine/               # ✅ Google AP2 enterprise
├── acp-vending-machine/               # ✅ OpenAI + Stripe consumer
├── mastercard-vending-machine/        # ✅ Mastercard TradFi (NEW)
├── pay3-vending-machine/              # 📋 Pay3 stablecoin (planned)
├── hybrid-examples/                   # 📋 Multi-protocol agents (planned)
├── docker-compose.yml                 # 🐳 Production deployment
├── docker-compose.dev.yml             # 🐳 Development environment
└── .env.example                       # 📝 Environment template
```

## 🔧 Setup Requirements

### Prerequisites
- **Node.js** 18+ (all examples)
- **Docker** (optional, for containerized deployment)
- **Git** (for cloning)
- **Redis** (optional, for production storage - Docker Compose includes it)

### Protocol-Specific Requirements

| Protocol | Additional Requirements |
|----------|------------------------|
| x402 | Crypto wallet (Base/Ethereum) |
| AP2 | Google Cloud account, enterprise credentials |
| ACP | OpenAI API key, Stripe account |
| Mastercard | Mastercard developer account (or use mock mode) |

### Environment Setup
Copy and configure the environment template:

```bash
# Root level (shared config)
cp .env.example .env

# Protocol-specific
cd x402-vending-machine && cp .env.example .env
cd mastercard-vending-machine && cp .env.example .env
# Edit .env files with your configuration
```

## 📚 Documentation

### Getting Started
- [**Docker Quickstart**](./docs/DOCKER_QUICKSTART.md) - Get running with Docker in 2 minutes
- [**Testing Guide**](./docs/TESTING.md) - How to test vending machines and agents
- [**Production Deployment**](./docs/PRODUCTION.md) - Deploy to production safely

### Shared Utilities
- [**Storage Layer**](./shared/storage/README.md) - Redis + in-memory storage
- [**Middleware Suite**](./shared/middleware/README.md) - Rate limiting, security, logging
- [**Testing Utilities**](./shared/testing/README.md) - Mock agents & test helpers

### Protocol Examples
- [**x402 README**](./x402-vending-machine/README.md) - Crypto micropayments
- [**AP2 README**](./ap2-vending-machine/README.md) - Enterprise authorization
- [**ACP README**](./acp-vending-machine/README.md) - Consumer checkout
- [**Mastercard README**](./mastercard-vending-machine/README.md) - Card payments

## 🎯 Real-World Use Cases

### x402 Examples
- **AI API Monetization**: Charge per API call with crypto
- **Data Streaming**: Real-time feeds with micropayments
- **Content Access**: Paywall without subscriptions

### AP2 Examples
- **Enterprise Procurement**: Automated B2B purchasing
- **Compliance Workflows**: Auditable agent transactions
- **Multi-Party Payments**: Complex payment flows

### ACP Examples
- **Conversational Commerce**: Shop within ChatGPT
- **AI Shopping Assistants**: Automated purchase agents
- **Consumer Marketplaces**: AI-driven product discovery

### Mastercard Examples
- **Traditional Integration**: Work with existing card infrastructure
- **Global Payments**: Accept payments worldwide
- **Enterprise Agents**: Corporate card processing for AI agents
- **Hybrid Systems**: Bridge crypto and traditional finance

## 🔐 Security Features

Every example includes:
- ✅ **Input validation** and sanitization (via shared middleware)
- ✅ **Rate limiting** to prevent abuse (configurable per agent type)
- ✅ **Agent detection** with trust classification
- ✅ **Audit logging** for all transactions
- ✅ **Error handling** with proper status codes
- ✅ **Environment variable** protection
- ✅ **Helmet security headers** and CORS configuration
- ✅ **API key authentication** (optional)
- ✅ **Signature verification** (optional)

### Security Checklist
- [ ] Environment variables configured
- [ ] Rate limits set appropriately
- [ ] Audit logging enabled
- [ ] HTTPS enforced in production
- [ ] Input validation active
- [ ] Agent detection configured
- [ ] Redis password set (if using Redis)
- [ ] Error handling tested

## 🧪 Testing

### Using Shared Testing Utilities

```javascript
const { MockAgentClient, fixtures, paymentHelpers } = require('./shared/testing');

// Create a mock AI agent
const agent = new MockAgentClient('openai');

// Use test fixtures
const product = fixtures.products.coffee;

// Test payment flow
const result = await paymentHelpers.testPaymentFlow({
  protocol: 'x402',
  amount: product.price,
  productId: product.id
});
```

### Run Tests

```bash
# Install shared utilities first
cd shared && npm install && cd ..

# Run vending machine tests
cd x402-vending-machine
npm test

# Run with coverage
npm run test:coverage
```

See [Testing Guide](./docs/TESTING.md) for comprehensive testing documentation.

## 🚀 Deployment

### Local Development

```bash
# Start individual vending machine
cd x402-vending-machine
npm run dev

# Or use Docker for full stack
docker-compose -f docker-compose.dev.yml up
```

### Production with Docker

```bash
# Start all services (Redis + all vending machines)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Environment Variables

```bash
# Storage Configuration
USE_REDIS=true
REDIS_URL=redis://localhost:6379

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

See [Production Deployment Guide](./docs/PRODUCTION.md) for complete instructions.

## 📊 Monitoring & Analytics

### Built-in Analytics
Each vending machine includes:
- Transaction volume and success rates
- Response times and error rates
- Agent detection statistics
- Storage backend status (Redis vs in-memory)

### Access Analytics

```bash
# x402
curl http://localhost:3000/analytics

# Mastercard
curl http://localhost:3003/api/analytics
```

### Integration Options
- **Datadog**: APM and infrastructure monitoring
- **New Relic**: Application performance monitoring
- **Prometheus**: Metrics collection with shared middleware
- **Winston**: File and console logging (built-in)

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Add New Protocol Examples
1. Fork the repository
2. Use `shared/` utilities for consistency
3. Create new directory: `{protocol}-vending-machine/`
4. Follow the structure of existing examples
5. Add comprehensive README, Dockerfile, and .env.example
6. Submit pull request

### Improve Shared Utilities
- Add new middleware (caching, compression, etc.)
- Enhance testing framework
- Improve storage adapters
- Add more mock agent behaviors

### Improve Existing Examples
- Integrate shared utilities into AP2 and ACP
- Add real blockchain verification (x402)
- Enhance security implementations
- Optimize performance

### Contribution Guidelines
- Follow existing code style
- Use shared utilities when possible
- Add tests for new functionality
- Update documentation
- Include security considerations

## 🔗 Related Resources

### Documentation
- [Docker Quickstart](./docs/DOCKER_QUICKSTART.md)
- [Testing Guide](./docs/TESTING.md)
- [Production Deployment](./docs/PRODUCTION.md)
- [Shared Utilities Documentation](./shared/README.md)

### External Resources
- [Awesome Agentic Economy](https://github.com/xpaysh/awesome-agentic-economy) - Complete protocol guide
- [Coinbase x402 Spec](https://github.com/coinbase/x402-protocol)
- [Google AP2 Documentation](https://developers.google.com/agent-payments)
- [OpenAI ACP Spec](https://platform.openai.com/docs/acp)
- [Mastercard Developer Portal](https://developer.mastercard.com/)

## 📈 Roadmap

### Current (v1.0)
- ✅ 4 working protocol implementations
- ✅ Production-ready shared utilities
- ✅ Docker deployment infrastructure
- ✅ Comprehensive testing framework

### Coming Soon (v1.1)
- 📋 Pay3 stablecoin implementation
- 📋 Hybrid multi-protocol examples
- 📋 Real blockchain verification (x402)
- 📋 Complete AP2/ACP shared utility integration

### Future (v2.0)
- 📋 Agent-to-agent payment coordination
- 📋 Cross-protocol arbitrage examples
- 📋 Advanced monitoring dashboards
- 📋 Production deployment templates (K8s, Terraform)

## 📄 License

MIT License - feel free to use these examples in your projects!

---

**🚀 Ready to build the future of autonomous payments?**

1. **Quick Start**: `docker-compose up` - Get all vending machines running
2. **Learn**: Browse [protocol READMEs](#available-implementations)
3. **Build**: Use [shared utilities](./shared/) for production features
4. **Deploy**: Follow the [production guide](./docs/PRODUCTION.md)

*Having issues? Check our [Docker Quickstart](./docs/DOCKER_QUICKSTART.md) or [Testing Guide](./docs/TESTING.md) for help.*
