use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettingsDto {
    pub read_receipts_enabled: bool,
    pub typing_indicators_enabled: bool,
    pub last_active_visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSettingsRequest {
    pub read_receipts_enabled: Option<bool>,
    pub typing_indicators_enabled: Option<bool>,
    pub last_active_visible: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MuteChatRequest {
    /// Mute a specific user or group conversation
    pub target_id: Uuid,
    /// true = mute, false = unmute
    pub muted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MutedChatDto {
    pub target_id: Uuid,
    pub muted: bool,
}
