# Agentic Economy Boilerplate

> 🚀 **The Rosetta Stone for Agentic Payments** - One vending machine, 5+ protocol implementations

Get from zero to working agentic payments in 5 minutes with our battle-tested boilerplate examples.

[![Main Repository](https://img.shields.io/badge/📚_Main_Repo-awesome--agentic--economy-blue)](https://github.com/xpaysh/awesome-agentic-economy)
![Protocols](https://img.shields.io/badge/Protocols-5+_Working-brightgreen)
![Setup Time](https://img.shields.io/badge/Setup_Time-5_minutes-orange)

## 🎯 Quick Start

### 🔥 The 5-Minute Challenge
Pick any protocol and get a working payment agent running:

```bash
# Clone this repository
git clone https://github.com/xpaysh/agentic-economy-boilerplate
cd agentic-economy-boilerplate

# Choose your adventure:
cd x402-vending-machine && npm install && npm start      # Crypto micropayments
cd ap2-vending-machine && npm install && npm start       # Enterprise authorization  
cd acp-stripe-vending-machine && npm install && npm start # Consumer checkout
cd pay3-vending-machine && npm install && npm start      # Stablecoin automation
cd mastercard-vending-machine && npm install && npm start # TradFi integration

# Your vending machine is now live! 🎉
```

## 🏗️ What You'll Build

Each example implements the same **Digital Vending Machine** that:
- ✅ Accepts payments via different protocols
- ✅ Dispenses digital "sodas" (JSON responses)
- ✅ Handles errors gracefully
- ✅ Includes security best practices
- ✅ Provides detailed logging

**The Power**: Compare protocols side-by-side with identical functionality.

## 📦 Available Examples

### 🟨 x402 Vending Machine
**Protocol**: Coinbase x402  
**Best For**: Crypto micropayments, AI agent APIs  
**Features**: HTTP 402 status code, instant settlement, zero fees

```bash
cd x402-vending-machine
curl -X GET http://localhost:3000/buy-soda
# Returns: 402 Payment Required with x402 headers
```

### 🟦 AP2 Vending Machine  
**Protocol**: Google Agent Payments Protocol  
**Best For**: Enterprise workflows, auditable payments  
**Features**: Verifiable credentials, mandate-based authorization

```bash
cd ap2-vending-machine  
npm start
# Accepts AP2 cart mandates and verifiable credentials
```

### 🟪 ACP Stripe Vending Machine
**Protocol**: OpenAI Agentic Commerce Protocol  
**Best For**: Consumer AI commerce, chat interfaces  
**Features**: Stripe integration, fraud prevention

```bash
cd acp-stripe-vending-machine
npm start
# Provides ChatGPT-style checkout experience
```

### 🟩 Pay3 Vending Machine
**Protocol**: Pay3 Stablecoin Protocol  
**Best For**: DeFi integration, cross-chain payments  
**Features**: USDC/USDT support, autonomous payouts

```bash
cd pay3-vending-machine
npm start  
# Accepts stablecoin payments across multiple chains
```

### 🟥 Mastercard Vending Machine
**Protocol**: Mastercard Agent Pay  
**Best For**: Traditional finance integration  
**Features**: Card network compatibility, global reach

```bash
cd mastercard-vending-machine
npm start
# Integrates with existing card infrastructure
```

## 🔄 Hybrid Examples

### Multi-Protocol Agent
See how advanced agents switch between protocols based on context:

```bash
cd hybrid-examples/smart-agent
npm start
# Automatically selects best protocol for each transaction
```

**Decision Logic**:
- `amount < $1` → x402 (micropayments)
- `enterprise + audit_required` → AP2 (compliance)
- `chat_context + consumer` → ACP (UX)
- `cross_border` → Pay3 or Mastercard

## 🛠️ Project Structure

```
agentic-economy-boilerplate/
├── x402-vending-machine/          # HTTP 402 crypto payments
│   ├── package.json
│   ├── server.js                  # Express server with x402 support
│   ├── config/                    # Environment configuration
│   └── README.md                  # Protocol-specific setup guide
├── ap2-vending-machine/           # Google AP2 enterprise
├── acp-stripe-vending-machine/    # OpenAI + Stripe consumer
├── pay3-vending-machine/          # Pay3 stablecoin
├── mastercard-vending-machine/    # Mastercard TradFi
└── hybrid-examples/               # Multi-protocol agents
    ├── smart-agent/               # Protocol selection logic
    └── cross-protocol-coordination/ # Agent-to-agent payments
```

## 🔧 Setup Requirements

### Prerequisites
- **Node.js** 18+ (all examples)
- **Docker** (optional, for containerized deployment)
- **Git** (for cloning)

### Protocol-Specific Requirements

| Protocol | Additional Requirements |
|----------|------------------------|
| x402 | Crypto wallet (Base/Ethereum) |
| AP2 | Google Cloud account, enterprise credentials |
| ACP | OpenAI API key, Stripe account |
| Pay3 | Polygon wallet, stablecoin balance |
| Mastercard | Mastercard developer account |

### Environment Setup
Each example includes a `.env.example` file. Copy and configure:

```bash
cd x402-vending-machine
cp .env.example .env
# Edit .env with your configuration
```

## 📚 Learning Path

### 🚀 Beginner (5 minutes)
1. Run the x402 example (simplest setup)
2. Make a test payment
3. Understand the HTTP 402 flow

### 🏃 Intermediate (30 minutes)  
1. Compare x402 vs ACP implementations
2. Modify the vending machine logic
3. Add custom product types

### 🧠 Advanced (2 hours)
1. Build a hybrid multi-protocol agent
2. Implement cross-protocol arbitrage
3. Add monitoring and analytics

## 🎯 Real-World Use Cases

Each example can be adapted for production use cases:

### x402 Examples
- **AI API Monetization**: Charge per API call
- **Data Streaming**: Real-time feeds with micropayments
- **Content Access**: Paywall without subscriptions

### AP2 Examples  
- **Enterprise Procurement**: Automated B2B purchasing
- **Compliance Workflows**: Auditable agent transactions
- **Multi-Party Payments**: Complex payment flows

### ACP Examples
- **Conversational Commerce**: Shop within chat
- **AI Shopping Assistants**: Automated purchase agents
- **Consumer Marketplaces**: AI-driven product discovery

### Pay3 Examples
- **DeFi Automation**: Yield farming agents
- **Cross-Border Payments**: Global stablecoin transfers
- **Gaming Economies**: In-game autonomous transactions

### Mastercard Examples
- **Traditional Integration**: Existing card infrastructure
- **Global Payments**: Worldwide merchant acceptance
- **Enterprise Security**: Bank-grade protection

## 🔐 Security Features

Every example includes:
- ✅ **Input validation** and sanitization
- ✅ **Rate limiting** to prevent abuse
- ✅ **Audit logging** for all transactions
- ✅ **Error handling** with proper status codes
- ✅ **Environment variable** protection
- ✅ **HTTPS enforcement** in production mode

### Security Checklist
- [ ] Environment variables configured
- [ ] Rate limits set appropriately  
- [ ] Audit logging enabled
- [ ] HTTPS enforced
- [ ] Input validation active
- [ ] Error handling tested

## 🧪 Testing

Each example includes comprehensive tests:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests  
npm run test:security      # Security tests
```

### Test Coverage
- **Payment flows**: Happy path and error cases
- **Security**: Rate limiting, input validation
- **Integration**: Protocol-specific edge cases
- **Performance**: Load testing scenarios

## 🚀 Deployment

### Local Development
```bash
npm run dev    # Development mode with hot reloading
```

### Production
```bash
npm run build  # Build production bundle
npm start      # Start production server
```

### Docker Deployment
```bash
# Build container
docker build -t vending-machine-x402 ./x402-vending-machine

# Run container
docker run -p 3000:3000 --env-file .env vending-machine-x402
```

### Cloud Deployment
- **Vercel**: One-click deployment with GitHub integration
- **Railway**: Container-based deployment  
- **Google Cloud Run**: Serverless container hosting
- **AWS Lambda**: Serverless function deployment

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Add New Protocol Examples
1. Fork the repository
2. Create new directory: `{protocol}-vending-machine/`
3. Implement the standard vending machine interface
4. Add comprehensive README and tests
5. Submit pull request

### Improve Existing Examples
- Add new features (analytics, monitoring)
- Improve security implementations
- Optimize performance
- Enhance documentation

### Contribution Guidelines
- Follow existing code style
- Add tests for new functionality
- Update documentation
- Include security considerations

## 📊 Analytics & Monitoring

### Built-in Analytics
Each example includes basic analytics:
- Transaction volume and success rates
- Response times and error rates  
- Protocol-specific metrics

### Integration Options
- **Datadog**: APM and infrastructure monitoring
- **New Relic**: Application performance monitoring
- **Prometheus**: Metrics collection and alerting
- **Custom Dashboards**: Protocol comparison views

## 🔗 Related Resources

### Main Documentation
- [Awesome Agentic Economy](https://github.com/xpaysh/awesome-agentic-economy) - Complete protocol guide
- [Protocol Documentation](../protocols/README.md) - Technical specifications
- [Security Best Practices](../security/README.md) - Security guidelines

### Community
- **Discord**: [Agentic Economy Builders](link)
- **Twitter**: [@AgenticEconomy](link)
- **Newsletter**: Weekly protocol updates

## 📄 License

MIT License - feel free to use these examples in your projects!

---

**🚀 Ready to build the future of autonomous payments? Pick a protocol above and get started in 5 minutes!**

*Having issues? Check our [FAQ](./FAQ.md) or join our [Discord](link) for help.*