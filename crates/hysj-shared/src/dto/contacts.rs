use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetNicknameRequest {
    pub nickname: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactDto {
    pub user_id: Uuid,
    pub username: String,
    pub display_name: Option<String>,
    pub nickname: Option<String>,
    pub is_blocked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactRequestDto {
    pub id: Uuid,
    pub from_user_id: Uuid,
    pub from_username: String,
    pub from_display_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnlineStatusDto {
    pub user_id: Uuid,
    pub is_online: bool,
    pub last_active_at: DateTime<Utc>,
}
