use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub phone_number: String,
    pub display_name: Option<String>,
    pub password_hash: String,
    pub salt: Vec<u8>,
    pub identity_public_key: Vec<u8>,
    pub identity_dh_public_key: Vec<u8>,
    pub totp_secret: Option<Vec<u8>>,
    pub has_2fa_enabled: bool,
    pub created_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub avatar_url: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Device {
    pub id: Uuid,
    pub user_id: Uuid,
    pub device_name: String,
    pub push_token: Option<String>,
    pub signed_pre_key: Vec<u8>,
    pub signed_pre_key_sig: Vec<u8>,
    pub kyber_public_key: Vec<u8>,
    pub is_online: bool,
    pub last_active_at: DateTime<Utc>,
    pub registered_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PreKey {
    pub id: i32,
    pub device_id: Uuid,
    pub public_key: Vec<u8>,
    pub is_used: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LoginAttempt {
    pub id: i32,
    pub ip_address: String,
    pub user_id: Option<Uuid>,
    pub success: bool,
    pub attempted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Group {
    pub id: Uuid,
    pub name: String,
    pub creator_id: Uuid,
    pub is_anonymous: bool,
    pub max_members: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct GroupMember {
    pub group_id: Uuid,
    pub user_id: Uuid,
    pub alias_name: Option<String>,
    pub alias_color: Option<String>,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Contact {
    pub user_id: Uuid,
    pub contact_user_id: Uuid,
    pub nickname: Option<String>,
    pub is_blocked: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct VpnServer {
    pub id: Uuid,
    pub name: String,
    pub country: String,
    pub city: Option<String>,
    pub endpoint: String,
    pub public_key: String,
    pub is_active: bool,
    pub max_connections: i32,
    pub current_connections: i32,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserVpnKey {
    pub user_id: Uuid,
    pub public_key: String,
    pub private_key_encrypted: Vec<u8>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
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

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EmojiPack {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub creator_id: Option<Uuid>,
    pub cover_image_url: Option<String>,
    pub is_premium: bool,
    pub price_cents: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Emoji {
    pub id: Uuid,
    pub pack_id: Uuid,
    pub shortcode: String,
    pub image_url: String,
    pub is_animated: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserEmojiPack {
    pub user_id: Uuid,
    pub pack_id: Uuid,
    pub purchased_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ContactRequest {
    pub id: Uuid,
    pub from_user_id: Uuid,
    pub to_user_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserSettings {
    pub user_id: Uuid,
    pub read_receipts_enabled: bool,
    pub typing_indicators_enabled: bool,
    pub last_active_visible: bool,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MutedChat {
    pub user_id: Uuid,
    pub target_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PinnedMessage {
    pub group_id: Uuid,
    pub message_id: String,
    pub pinned_by: Uuid,
    pub pinned_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct RelayNode {
    pub id: Uuid,
    pub address: String,
    pub public_key: String,
    pub region: String,
    pub is_active: bool,
    pub load_percent: i16,
    pub created_at: DateTime<Utc>,
    pub last_heartbeat_at: DateTime<Utc>,
}

/// A combined bundle containing everything needed to start a session with a user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreKeyBundleData {
    /// User's long-term Ed25519 identity public key
    pub identity_public_key: Vec<u8>,
    /// User's long-term X25519 DH identity public key
    pub identity_dh_public_key: Vec<u8>,
    /// Device ID that owns these keys
    pub device_id: Uuid,
    /// Device's signed pre-key (X25519)
    pub signed_pre_key: Vec<u8>,
    /// Signature over the signed pre-key
    pub signed_pre_key_sig: Vec<u8>,
    /// One-time pre-key (if available)
    pub one_time_pre_key: Option<Vec<u8>>,
    /// Post-quantum Kyber public key
    pub kyber_public_key: Vec<u8>,
}
