use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnConnectRequest {
    pub server_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnConnectResponse {
    pub config: serde_json::Value,
    pub session_id: Uuid,
    pub assigned_ip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnStatusResponse {
    pub connected: bool,
    pub session_id: Option<Uuid>,
    pub server: Option<VpnServerDto>,
    pub bytes_up: i64,
    pub bytes_down: i64,
    pub connected_since: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnServerDto {
    pub id: Uuid,
    pub name: String,
    pub country: String,
    pub city: Option<String>,
}
