# Architecture

## System Overview

```
+-------------------+          +-------------------+
|                   |  HTTPS   |                   |
|   Flutter App     |<-------->|   hysj-api        |
|   (Android/iOS/   |  WSS     |   (Axum server)   |
|    Web)           |          |                   |
+-------------------+          +--------+----------+
                                        |
                          +-------------+-------------+
                          |                           |
                 +--------v--------+       +----------v---------+
                 |                 |       |                    |
                 |  PostgreSQL 16  |       |    Redis 7         |
                 |  (persistent)   |       |    (ephemeral)     |
                 |                 |       |                    |
                 |  users          |       |  encrypted msgs    |
                 |  devices        |       |  72h TTL           |
                 |  pre_keys       |       |  zero persistence  |
                 |  groups         |       |                    |
                 |  contacts       |       +--------------------+
                 |  settings       |
                 +-----------------+
```

The API server handles REST endpoints and WebSocket connections. PostgreSQL stores persistent data (users, devices, keys). Redis holds only encrypted messages temporarily until delivery.

## Crate Map

| Crate            | Description |
|------------------|-------------|
| `hysj-api`       | Axum HTTP server with 30+ REST endpoints, WebSocket handler, middleware (auth, rate limiting), and background services |
| `hysj-crypto`    | Cryptographic primitives: X3DH key agreement, Double Ratchet, XChaCha20-Poly1305 AEAD, Sealed Sender, 3-hop Onion Routing, ML-KEM-768 post-quantum hybrid, HKDF-SHA256 |
| `hysj-auth`      | Authentication: Argon2id password hashing, JWT token issuance/validation, TOTP two-factor authentication, Ed25519 sender certificates |
| `hysj-db`        | Database access layer: SQLx queries for all PostgreSQL tables (users, devices, pre_keys, groups, contacts, settings, VPN, emojis) |
| `hysj-messaging` | Message lifecycle: Redis queue (enqueue/dequeue), remote wipe (conversation/device/all), media store for encrypted file uploads, OTP delivery |
| `hysj-shared`    | Shared types: request/response DTOs, error types, pagination helpers, constants |
| `hysj-vpn`       | VPN support: WireGuard key pair generation, client/server config templates, session management |
| `native`         | Flutter Rust Bridge: FFI bindings exposing crypto operations to the Flutter app |

## Message Flow

### 1. Registration

```
Client                          Server                    PostgreSQL
  |-- POST /auth/register -------->|                          |
  |   (username, password,         |-- INSERT user ---------->|
  |    identity_key, device_key,   |-- INSERT device -------->|
  |    kyber_key, pre_keys)        |-- INSERT pre_keys ------>|
  |<-------- JWT token ------------|                          |
```

### 2. Key Exchange (X3DH)

```
Alice                           Server                    PostgreSQL
  |-- GET /keys/{bob_id} --------->|                          |
  |                                |-- SELECT pre_key ------->|
  |<-- pre_key bundle -------------|   (mark used)            |
  |                                |                          |
  | [Perform X3DH locally]        |                          |
  | [Derive shared secret]        |                          |
  | [Initialize Double Ratchet]   |                          |
```

### 3. Message Send

```
Alice (client-side)              Server                     Redis
  |                                |                          |
  | 1. Encrypt (Double Ratchet)   |                          |
  | 2. Seal sender identity       |                          |
  | 3. Onion wrap (3 layers)      |                          |
  |                                |                          |
  |-- POST /messages/send -------->|                          |
  |   (encrypted blob)            |-- LPUSH queue ---------->|
  |                                |-- SET TTL 72h ---------->|
  |                                |                          |
  |                                |-- WS notify Bob -------->|
  |<-------- 202 Accepted --------|                          |
```

### 4. Message Delivery

```
Bob (client-side)                Server                     Redis
  |                                |                          |
  |<-- WS: new message ------------|<-- RPOP queue -----------|
  |   (encrypted blob)            |-- DELETE from Redis ---->|
  |                                |                          |
  | 1. Onion unwrap (3 layers)    |                          |
  | 2. Unseal sender identity     |                          |
  | 3. Decrypt (Double Ratchet)   |                          |
  |                                |                          |
  |-- WS: delivery ACK ---------->|                          |
```

Messages are deleted from Redis immediately upon delivery confirmation. Undelivered messages expire after 72 hours via Redis TTL.

## Database Schema

PostgreSQL stores persistent data only. Messages are never written to the database.

| Table              | Purpose |
|--------------------|---------|
| `users`            | User accounts: username, phone (private), password hash, identity keys, 2FA |
| `devices`          | Registered devices per user: push tokens, signed pre-key, Kyber public key |
| `pre_keys`         | One-time pre-keys for X3DH, consumed on use |
| `login_attempts`   | Rate limiting and brute-force protection |
| `groups`           | Group chat metadata: name, creator, anonymous mode, max members |
| `group_members`    | Group membership with roles, aliases, and colors |
| `contacts`         | User contacts with nicknames and block status |
| `contact_requests` | Pending contact requests (opt-in contact adding) |
| `user_settings`    | Privacy settings: read receipts, typing indicators, last-active visibility |
| `muted_chats`      | Per-user muted conversations |
| `pinned_messages`  | Pinned messages within groups |
| `vpn_servers`      | Available WireGuard VPN servers |
| `user_vpn_keys`    | Per-user VPN key pairs (private key stored encrypted) |
| `vpn_sessions`     | Active and historical VPN sessions with bandwidth tracking |
| `emoji_packs`      | Custom emoji packs (free and premium) |
| `emojis`           | Individual emoji assets within packs |
| `user_emoji_packs` | User-purchased emoji pack ownership |

## Redis Usage

Redis serves as an ephemeral message queue with zero disk persistence:

- **Configuration:** `save ""` and `appendonly no` -- nothing is written to disk
- **Memory limit:** 64 MB with `allkeys-lru` eviction policy
- **Message TTL:** 72 hours -- undelivered messages are automatically destroyed
- **Deletion:** Messages are removed immediately upon delivery confirmation
- **Content:** Only encrypted blobs -- Redis never sees plaintext

## WebSocket

The WebSocket handler (`hysj-api/src/ws/`) provides real-time functionality:

- **Message delivery** -- Push encrypted messages to online recipients
- **Typing indicators** -- Broadcast typing state to conversation participants
- **Read receipts** -- Notify senders when messages are read
- **Online presence** -- Track device online/offline status
- **Connection tracking** -- Map authenticated users to active WebSocket connections

## Background Services

Three background tasks run within the API server (`hysj-api/src/background/`):

| Service               | Purpose |
|------------------------|---------|
| `message_expiry`       | Scans Redis for messages past their 72-hour TTL and deletes them |
| `rate_limit_cleanup`   | Purges old login attempt records from PostgreSQL |
| `wipe_pending`         | Processes pending remote wipe requests (conversation, device, or full account wipe) |

## Flutter App

The Flutter frontend (`app/`) is organized as follows:

- **Screens (13):** Login, Register, OTP verification, Chat list, Conversation, Calls, Incoming call, Video call, Profile, Settings, Menu overlay, Home shell
- **Services:** `ApiClient` (HTTP via REST), `WsClient` (WebSocket for real-time), `AuthService` (JWT token management)
- **Theme:** `HysjTheme` with light and dark modes, design tokens in `hysj_theme.dart`, three font families (Instrument Serif, Geist, Geist Mono)
- **Widgets:** Reusable components in `app/lib/widgets/`
- **Native bridge:** Crypto operations are performed in Rust via FFI (`native/` crate) using Flutter Rust Bridge
