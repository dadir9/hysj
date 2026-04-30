-- Contact requests (opt-in contact adding)
CREATE TABLE IF NOT EXISTS contact_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id)
);
CREATE INDEX idx_contact_requests_to ON contact_requests(to_user_id);
CREATE INDEX idx_contact_requests_from ON contact_requests(from_user_id);

-- User privacy/notification settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id                     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    read_receipts_enabled       BOOLEAN NOT NULL DEFAULT true,
    typing_indicators_enabled   BOOLEAN NOT NULL DEFAULT true,
    last_active_visible         BOOLEAN NOT NULL DEFAULT true
);

-- Muted chats (per user, per conversation target)
CREATE TABLE IF NOT EXISTS muted_chats (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, target_id)
);
CREATE INDEX idx_muted_chats_user ON muted_chats(user_id);

-- Pinned messages in groups
CREATE TABLE IF NOT EXISTS pinned_messages (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    message_id  TEXT NOT NULL,
    pinned_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pinned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, message_id)
);
CREATE INDEX idx_pinned_messages_group ON pinned_messages(group_id);
