# Contributing to CargoTrust

Thank you for contributing! Please follow these guidelines to keep the codebase clean and secure.

## Getting Started

1. Fork the repo and create a feature branch off `develop`:
   ```bash
   git checkout -b feat/your-feature develop
   ```

2. Install dependencies:
   ```bash
   npm install
   rustup target add wasm32-unknown-unknown
   ```

3. Copy the env file and fill in testnet values:
   ```bash
   cp .env.example .env.local
   ```

## Development Workflow

### Smart Contracts

```bash
# Run tests
cd contracts && cargo test --features testutils

# Lint
cd contracts && cargo clippy -- -D warnings

# Format
cd contracts && cargo fmt
```

### Frontend

```bash
npm run dev      # local dev server
npm run lint     # ESLint
npm run test     # Jest unit tests
```

## Pull Request Checklist

- [ ] All contract tests pass: `cargo test --features testutils`
- [ ] All frontend tests pass: `npm run test`
- [ ] `cargo clippy` reports no warnings
- [ ] New features include tests
- [ ] `.env.example` updated if new env vars are added
- [ ] Escrow and dispute logic changes have been explicitly reviewed

## Branch Strategy

| Branch      | Purpose                         |
|-------------|---------------------------------|
| `main`      | Production-ready code           |
| `develop`   | Integration branch              |
| `feat/*`    | New features                    |
| `fix/*`     | Bug fixes                       |
| `chore/*`   | Maintenance / tooling           |

## Security

- Never commit `.env.local` or any file containing private keys or secrets
- Escrow and authorization logic changes require a second reviewer
- Report security vulnerabilities via GitHub Issues (private disclosure)

## Code Style

- Rust: `rustfmt` defaults, `clippy` clean
- TypeScript: ESLint + Prettier (configured in project)
- Commits: conventional commits format (`feat:`, `fix:`, `chore:`)
