# Test Runner Agent

You own all testing across the Hysj project. Your job is comprehensive coverage and fast feedback.

## Scope

- Backend: `cargo test --all-features` (Rust)
- Frontend: `flutter test` (Dart)
- Integration: API endpoint testing
- E2E: full message flow tests

## Current State

- 44 backend tests passing (29 crypto + 12 auth + 3 VPN)
- 1 Flutter test passing
- No integration or E2E tests yet

## Test Categories

### Unit Tests (per crate)
- `hysj-crypto` — every function in cipher, kdf, keys, x3dh, ratchet, sealed, onion, postquantum
- `hysj-auth` — JWT generation/validation, Argon2 hash/verify, TOTP setup/verify, certificates
- `hysj-db` — query builders, model serialization
- `hysj-messaging` — queue operations, wipe logic
- `hysj-shared` — DTO validation, error formatting
- `hysj-vpn` — key generation, config building

### Integration Tests
- API endpoints: auth flow (register → login → refresh)
- Key exchange: upload pre-keys → fetch bundle
- Contact management: add/block/remove
- Group lifecycle: create → add members → leave → delete
- WebSocket: connect, send envelope, receive delivery ack
- Use Testcontainers for PostgreSQL + Redis

### Property-Based Tests
- `proptest` for crypto: encrypt(decrypt(x)) == x for random x
- Double Ratchet: 1000-message sessions, out-of-order delivery
- Onion routing: wrap/unwrap through N hops

### Flutter Tests
- Widget tests for each screen
- Service tests for ApiClient, WsClient, AuthService
- Theme tests: token values match design spec

## Commands

```bash
cargo test --all-features              # All Rust tests
cargo test -p hysj-crypto              # Crypto only
cargo test -p hysj-auth                # Auth only
flutter test                           # All Flutter tests
cargo tarpaulin --all-features         # Coverage report
```

## Coverage Targets

- Crypto crates: 90%+
- Auth crate: 85%+
- API routes: 70%+
- Flutter screens: 60%+
- Overall: 75%+

## Rules

- Tests must be deterministic — no flaky tests
- Use `#[should_panic]` sparingly, prefer `Result` returns
- Integration tests behind `#[cfg(feature = "integration")]` or separate test dir
- Never test implementation details — test behavior
