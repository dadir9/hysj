# Hysj

**Shh. Your messages are yours.**

Hysj is a zero-storage, end-to-end encrypted messenger. The server acts as a blind relay -- it never sees your plaintext, never stores your messages, and deletes everything the moment it is delivered. If a message is not delivered within 72 hours, it is permanently destroyed.

## Key Features

- **End-to-end encryption** -- Signal Protocol (X3DH + Double Ratchet) with XChaCha20-Poly1305
- **Zero server storage** -- Messages exist only in Redis with a 72-hour TTL; deleted on delivery
- **Sealed Sender** -- The server cannot see who sent a message
- **Onion Routing** -- 3-hop relay to resist traffic analysis
- **Post-quantum hybrid** -- ML-KEM-768 key exchange protects against future quantum attacks
- **Voice messages with effects** -- Encrypted voice notes with audio processing
- **Built-in VPN** -- WireGuard-based VPN tunneling
- **Self-destructing messages** -- Messages auto-delete after delivery confirmation
- **Remote wipe** -- Erase conversations, devices, or all data remotely

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Backend     | Rust (Axum), 8 workspace crates                 |
| Frontend    | Flutter / Dart                                   |
| Database    | PostgreSQL 16 (users, devices, keys only)        |
| Message Queue | Redis 7 (ephemeral, zero disk persistence)     |
| Crypto      | X3DH, Double Ratchet, XChaCha20-Poly1305, HKDF-SHA256, Sealed Sender, Onion Routing, ML-KEM-768 |
| Containers  | Docker Compose (API + PostgreSQL + Redis)        |
| CI          | GitHub Actions (cargo fmt/clippy/test + flutter analyze/test) |

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/dadir9/hysj.git
cd hysj
docker compose up
```

This starts the API server on port 8080, PostgreSQL on 5432, and Redis on 6379.

### Development Setup

**Prerequisites:**
- Rust 1.94+
- Flutter 3.11+
- PostgreSQL 16
- Redis 7

**Backend:**

```bash
cargo build                     # Build all crates
cargo test --all-features       # Run all tests (44 tests)
cargo clippy -- -D warnings     # Lint
cargo fmt --all -- --check      # Format check
```

**Frontend:**

```bash
cd app
flutter pub get                 # Install dependencies
flutter analyze                 # Lint
flutter test                    # Run tests
flutter run -d chrome           # Run on web
flutter run -d android          # Run on Android emulator
```

## Project Structure

```
hysj/
  crates/
    hysj-api/          Axum server, REST endpoints + WebSocket
    hysj-crypto/       X3DH, Double Ratchet, Sealed Sender, Onion Routing, ML-KEM-768
    hysj-auth/         Argon2id passwords, JWT, TOTP 2FA, Ed25519 certificates
    hysj-db/           SQLx CRUD layer (PostgreSQL)
    hysj-messaging/    Redis message queue, remote wipe, media store
    hysj-shared/       DTOs, error types, constants
    hysj-vpn/          WireGuard key generation + config
  native/              Flutter Rust Bridge (FFI for crypto)
  app/                 Flutter frontend
    lib/
      screens/         13 screens (auth, chats, calls, settings)
      services/        ApiClient, WsClient, AuthService
      widgets/         Reusable UI components
      theme/           Design tokens (light/dark)
  migrations/          PostgreSQL migration files
  docker-compose.yml   API + PostgreSQL 16 + Redis 7
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) -- System design, crate map, message flow
- [THREAT_MODEL.md](THREAT_MODEL.md) -- Cryptographic protocols and threat analysis
- [SECURITY.md](SECURITY.md) -- Vulnerability reporting and security policy
- [CONTRIBUTING.md](CONTRIBUTING.md) -- How to contribute

## License

Hysj is licensed under the [GNU Affero General Public License v3.0](LICENSE).
