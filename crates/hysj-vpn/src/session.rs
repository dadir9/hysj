use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents an active or completed VPN session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub server_id: Uuid,
    pub client_public_key: String,
    pub assigned_ip: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub bytes_up: i64,
    pub bytes_down: i64,
}
