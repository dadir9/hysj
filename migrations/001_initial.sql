-- Hysj v2 initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(32) NOT NULL UNIQUE,
    phone_number    VARCHAR(20) NOT NULL UNIQUE,
    display_name    TEXT,
    password_hash   TEXT NOT NULL,
    salt            BYTEA NOT NULL,
    identity_public_key   BYTEA NOT NULL,
    identity_dh_public_key BYTEA NOT NULL,
    totp_secret     BYTEA,
    has_2fa_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_phone ON users (phone_number);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name     VARCHAR(64) NOT NULL,
    push_token      TEXT,
    signed_pre_key  BYTEA NOT NULL,
    signed_pre_key_sig BYTEA NOT NULL,
    kyber_public_key BYTEA NOT NULL,
    is_online       BOOLEAN NOT NULL DEFAULT false,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE INDEX idx_devices_online ON devices (is_online) WHERE is_online = true;

-- One-time pre-keys
CREATE TABLE IF NOT EXISTS pre_keys (
    id          SERIAL PRIMARY KEY,
    device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    public_key  BYTEA NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pre_keys_device_available ON pre_keys (device_id, is_used) WHERE is_used = false;

-- Login attempts (rate limiting / lockout)
CREATE TABLE IF NOT EXISTS login_attempts (
    id          SERIAL PRIMARY KEY,
    ip_address  VARCHAR(45) NOT NULL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    success     BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_ip ON login_attempts (ip_address, attempted_at);
CREATE INDEX idx_login_attempts_user ON login_attempts (user_id, attempted_at);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(64) NOT NULL,
    creator_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    max_members INTEGER NOT NULL DEFAULT 50,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_creator ON groups (creator_id);

-- Group members (junction table)
CREATE TABLE IF NOT EXISTS group_members (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alias_name  VARCHAR(32),
    alias_color VARCHAR(7),
    role        VARCHAR(16) NOT NULL DEFAULT 'member',
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members (user_id);
CREATE INDEX idx_group_members_group ON group_members (group_id);

-- Contacts table (per-user nicknames, blocking)
CREATE TABLE IF NOT EXISTS contacts (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname        TEXT,
    is_blocked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, contact_user_id)
);

CREATE INDEX idx_contacts_user ON contacts(user_id);

-- VPN
CREATE TABLE IF NOT EXISTS vpn_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT,
    endpoint TEXT NOT NULL,
    public_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_connections INT NOT NULL DEFAULT 100,
    current_connections INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_vpn_keys (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key_encrypted BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS vpn_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES vpn_servers(id),
    client_public_key TEXT NOT NULL,
    assigned_ip TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    bytes_up BIGINT NOT NULL DEFAULT 0,
    bytes_down BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_vpn_sessions_user ON vpn_sessions(user_id);
CREATE INDEX idx_vpn_sessions_active ON vpn_sessions(user_id) WHERE ended_at IS NULL;

-- Emojis
CREATE TABLE IF NOT EXISTS emoji_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id),
    cover_image_url TEXT,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    price_cents INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emojis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pack_id UUID NOT NULL REFERENCES emoji_packs(id) ON DELETE CASCADE,
    shortcode TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_animated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pack_id, shortcode)
);
CREATE INDEX idx_emojis_pack ON emojis(pack_id);

CREATE TABLE IF NOT EXISTS user_emoji_packs (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES emoji_packs(id) ON DELETE CASCADE,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, pack_id)
);
