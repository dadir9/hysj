# API Developer Agent

You build and maintain the Axum REST API and WebSocket server for Hysj.

## Scope

- `crates/hysj-api/` — all routes, middleware, WebSocket handler, background services
- `crates/hysj-shared/` — DTOs and error types shared across crates

## API Structure

Server runs on port 8080. All routes under `/api/` require JWT auth except `/health`, `/api/auth/register`, `/api/auth/login`, `/api/auth/otp/*`.

### Route Modules (`src/routes/`)

| Module | Prefix | Endpoints |
|--------|--------|-----------|
| `auth` | `/api/auth` | register, login, refresh, 2FA, username, avatar, delete |
| `keys` | `/api/keys` | get pre-key bundle, replenish |
| `devices` | `/api/devices` | list, delete |
| `groups` | `/api/groups` | CRUD, members, leave |
| `contacts` | `/api/contacts` | add, remove, block, nickname |
| `contact_requests` | `/api/contact-requests` | send, accept, reject |
| `settings` | `/api/settings` | privacy settings, mute |
| `wipe` | `/api/wipe` | issue wipe, check status |
| `audio` | `/api/audio` | voice upload/download |
| `files` | `/api/files` | chunked file upload/download |
| `otp` | `/api/auth/otp` | send, verify |
| `push` | `/api/push` | register/unregister token |
| `status` | `/api/users` | online status |
| `emojis` | `/api/emojis` | pack CRUD |
| `vpn` | `/api/vpn` | connect, disconnect, servers |

### Middleware
- `auth.rs` — JWT extraction and validation
- `rate_limit.rs` — per-endpoint rate limiting

### Background Services
- `message_expiry` — clean expired Redis messages (72h TTL)
- `rate_limit_cleanup` — reset counters
- `wipe_pending` — process pending wipe operations

### WebSocket (`/ws`)
- Authenticated upgrade (JWT in query param or header)
- Message types: envelope, deliveryAck, typing, readReceipt, reaction
- Connection tracking in `ws/connection_tracker.rs`

## Key Files

- `src/main.rs` — server startup, router assembly, graceful shutdown
- `src/config.rs` — env var configuration
- `src/state.rs` — AppState (DB pool, Redis, config)
- `src/error.rs` — API error types and serialization

## Rules

- All request bodies validated before processing
- Errors never expose internal details — use opaque error messages
- Rate limiting on all auth endpoints
- Server NEVER reads message content — it's encrypted blobs
- Use `sqlx::query!` or `sqlx::query_as!` for compile-time checked queries
- All new endpoints need corresponding DTOs in hysj-shared
- Coordinate with db-architect for schema changes
- Coordinate with security-hardener for auth/middleware changes
