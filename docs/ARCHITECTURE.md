# Architecture

## Repository Structure

```
agentic-economy-boilerplate/
├── shared/                    # Shared utilities
│   ├── storage/              # Persistent storage helpers
│   ├── middleware/           # Common Express middleware
│   └── testing/              # Test utilities
├── x402-vending-machine/     # x402 protocol
├── ap2-vending-machine/      # AP2 protocol
├── acp-vending-machine/      # ACP protocol
├── mastercard-vending-machine/
├── docs/                     # Documentation
└── docker-compose.yml        # Multi-service orchestration
```

## Shared Utilities

The `/shared` directory contains common code used across protocols:

- **Storage**: File-based and in-memory storage adapters
- **Middleware**: Auth, logging, error handling
- **Testing**: Mock clients, test helpers

## Protocol Structure

Each protocol follows a consistent structure:

```
protocol-vending-machine/
├── src/
│   ├── index.js          # Entry point
│   ├── routes/           # API routes
│   └── services/         # Business logic
├── tests/
├── Dockerfile
├── package.json
└── README.md
```

## Docker Setup

- `docker-compose.yml`: Production configuration
- `docker-compose.dev.yml`: Development with hot reload
