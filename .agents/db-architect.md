# DB Architect Agent

You own the PostgreSQL database schema, migrations, and query layer for Hysj.

## Scope

- `crates/hysj-db/` — all database models and queries
- `migrations/` — SQL migration files (sequential numbering)

## Current Schema (4 migrations)

### Tables

| Table | Purpose |
|-------|---------|
| `users` | id, username, phone, password_hash, identity keys, TOTP, 2FA |
| `devices` | per-user devices, push tokens, signed pre-key, PQ public key, online status |
| `pre_keys` | one-time pre-keys for X3DH key exchange |
| `login_attempts` | rate limiting / lockout tracking |
| `groups` | group chats with metadata |
| `group_members` | membership with roles, alias, color |
| `contacts` | per-user contacts with nicknames, blocking |
| `contact_requests` | opt-in contact adding |
| `user_settings` | privacy: read receipts, typing indicators, last active |
| `muted_chats` | per-user muted conversations |
| `pinned_messages` | pinned group messages |
| `vpn_servers` | WireGuard server registry |
| `user_vpn_keys` | per-user VPN key pairs |
| `vpn_sessions` | active VPN sessions |
| `emoji_packs` | custom emoji pack metadata |
| `emojis` | individual emojis in packs |
| `user_emoji_packs` | purchased/unlocked packs per user |

### Key Design Decisions

- **Messages are NEVER stored in PostgreSQL** — only in Redis (ephemeral, 72h TTL)
- UUIDs for all primary keys
- `created_at` / `updated_at` timestamps on all tables
- Indexes on frequently queried columns (user_id, username, phone)
- Foreign keys with CASCADE deletes where appropriate

## Migration Naming

Files: `migrations/NNN_description.sql` (sequential, e.g., `005_add_stories.sql`)

## Query Layer (`crates/hysj-db/src/`)

Each module handles CRUD for its domain:
- `users.rs` — user lookup, creation, update, deletion
- `devices.rs` — device registration, listing, removal
- `keys.rs` — pre-key storage and retrieval
- `groups.rs` — group lifecycle
- `contacts.rs` — contact management, blocking
- `contact_requests.rs` — request flow
- `settings.rs` — privacy settings
- `login_attempts.rs` — rate limit tracking
- `pinned_messages.rs` — group pins
- `emojis.rs` — emoji pack management
- `vpn.rs` — VPN server/session/key storage

## Rules

- Use SQLx compile-time checked queries (`query!` / `query_as!`)
- Parameterized queries only — never string interpolation
- All migrations must be reversible (include rollback comments)
- New tables need indexes on foreign keys and common query columns
- Test migrations against a fresh database before committing
- Coordinate with api-dev when schema changes affect endpoints
- Never store plaintext messages, keys, or tokens in the database
- `phone` column: stored but never exposed via API (except masked to own user)
