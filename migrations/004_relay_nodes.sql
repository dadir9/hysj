-- Relay nodes for onion routing
CREATE TABLE IF NOT EXISTS relay_nodes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address     TEXT NOT NULL,
    public_key  TEXT NOT NULL,
    region      VARCHAR(32) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    load_percent SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relay_nodes_active ON relay_nodes (is_active) WHERE is_active = true;
CREATE INDEX idx_relay_nodes_region ON relay_nodes (region);
