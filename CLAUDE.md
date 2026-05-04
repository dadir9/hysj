# CLAUDE.md — Hysj v2

Zero-storage encrypted messaging app. Rust backend + Flutter frontend.

## Commands

### Backend (Rust)
```bash
cargo build                    # Build all crates
cargo test --all-features      # Run all tests (44 tests)
cargo clippy -- -D warnings    # Lint
cargo fmt --all -- --check     # Format check
```

### Frontend (Flutter)
```bash
cd app
flutter analyze                # Lint
flutter test                   # Run tests
flutter run -d chrome          # Run on web
flutter run -d android         # Run on Android emulator
```

### Docker (full stack)
```bash
docker compose up              # API + PostgreSQL + Redis
```

## Architecture

**Backend — 8 Rust crates:**
- `hysj-api` — Axum server, 30+ REST endpoints + WebSocket
- `hysj-crypto` — X3DH, Double Ratchet, XChaCha20-Poly1305, Sealed Sender, Onion Routing, ML-KEM-768
- `hysj-auth` — Argon2id passwords, JWT, TOTP 2FA, Ed25519 sender certificates
- `hysj-db` — SQLx CRUD (PostgreSQL)
- `hysj-messaging` — Redis message queue + remote wipe + media store
- `hysj-shared` — DTOs, error types, constants
- `hysj-vpn` — WireGuard key generation + config
- `native` — Flutter Rust Bridge (FFI for crypto)

**Frontend — Flutter app (`app/`):**
- 13 screens across Auth, Chats, Calls, Settings
- Services: ApiClient (HTTP), WsClient (WebSocket), AuthService (JWT)
- Theme: HysjTheme (light/dark) with design tokens in `hysj_theme.dart`
- Widgets: reusable components in `app/lib/widgets/`

**Infrastructure:**
- PostgreSQL 16 — users, devices, keys (never messages)
- Redis 7 — ephemeral message queue, `save ""`, `appendonly no`, 72h TTL
- Docker Compose — API + PostgreSQL + Redis

## Key Conventions

- Phone numbers are private — never displayed outside Settings
- Users are identified by `@username` handles everywhere
- Server is zero-trust: blind relay, never stores plaintext
- Messages deleted on delivery confirmation or after 72h TTL
- All crypto happens on client side

## Rust Conventions
- File-scoped namespaces
- `record` style for DTOs (Rust structs with `#[derive(Serialize, Deserialize)]`)
- `Async` suffix not used (Rust async is implicit)
- `snake_case` for functions, `PascalCase` for types
- `zeroize` for sensitive data in memory

## Flutter Conventions
- Design tokens in `HysjColors` and `HysjTypo`
- Three font families: Instrument Serif (display), Geist (body), Geist Mono (labels)
- Screens in `app/lib/screens/{section}/`
- Widgets in `app/lib/widgets/`

## Agent Files
Specialized agents in `.agents/` — see each file for scope and instructions.
