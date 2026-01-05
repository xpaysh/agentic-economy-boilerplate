# Contributing to Agentic Economy Boilerplate

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch: `git checkout -b feature/your-feature`

## Development Setup

```bash
# Install dependencies for a specific protocol
cd x402-vending-machine
npm install

# Run tests
npm test

# Start development server
npm run dev
```

## Adding a New Protocol

1. Create a new directory: `your-protocol-vending-machine/`
2. Use existing protocols as templates (recommend starting with `x402-vending-machine`)
3. Required files:
   - `README.md` - Protocol documentation
   - `package.json` - Dependencies
   - `src/` - Implementation
   - `tests/` - Test suite
   - `Dockerfile` - Container setup

## Pull Request Process

1. Ensure tests pass locally
2. Update documentation if needed
3. Follow existing code style
4. Create PR with clear description
5. Link related issues

## Commit Messages

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## Questions?

Open a GitHub Discussion or Issue for help.
