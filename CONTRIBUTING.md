# Contributing to Hysj

Thank you for your interest in contributing to Hysj. This document covers the development workflow and conventions.

## Prerequisites

- **Rust 1.94+** -- install via [rustup](https://rustup.rs/)
- **Flutter 3.11+** -- install via [flutter.dev](https://flutter.dev/docs/get-started/install)
- **Docker** and **Docker Compose** -- for running PostgreSQL and Redis locally

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/hysj.git
   cd hysj
   ```
3. **Start infrastructure:**
   ```bash
   docker compose up -d postgres redis
   ```
4. **Run the backend:**
   ```bash
   cargo build
   cargo test --all-features
   ```
5. **Run the frontend:**
   ```bash
   cd app
   flutter pub get
   flutter run -d chrome
   ```

## Code Style

### Rust

```bash
cargo fmt --all -- --check     # Format check (must pass)
cargo clippy -- -D warnings    # Lint (zero warnings allowed)
```

### Flutter

```bash
cd app
flutter analyze                # Dart analysis (zero issues allowed)
```

## Branch Naming

Use the following prefixes:

- `feature/*` -- New features (e.g., `feature/safety-numbers`)
- `fix/*` -- Bug fixes (e.g., `fix/token-refresh-race`)
- `docs/*` -- Documentation changes (e.g., `docs/update-threat-model`)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add safety number verification screen
fix: prevent double-delivery of WebSocket messages
docs: update threat model with Kyber details
refactor: extract cipher module from crypto crate
test: add Double Ratchet out-of-order delivery tests
```

## Pull Request Process

1. Create a branch from `main` using the naming convention above.
2. Make your changes and ensure all checks pass locally.
3. Write or update tests for any changed behavior.
4. Open a pull request with:
   - A clear description of what changed and why
   - A link to the related issue (if any)
   - Confirmation that `cargo test --all-features` and `flutter test` pass
5. All CI checks must pass before merge.
6. A maintainer will review your PR. Address any feedback promptly.

## Testing

### Rust

```bash
cargo test --all-features      # Run all 44 tests
```

Tests cover:
- Cryptographic operations (X3DH, Double Ratchet, Sealed Sender, Onion Routing)
- Database queries
- API endpoints
- Authentication and authorization

### Flutter

```bash
cd app
flutter test                   # Run all widget and unit tests
```

## Security Vulnerabilities

If you discover a security vulnerability, **do not open a public issue or pull request**. Instead, follow the process described in [SECURITY.md](SECURITY.md).

## License

By contributing to Hysj, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
