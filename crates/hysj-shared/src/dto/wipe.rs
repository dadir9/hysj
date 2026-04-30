use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WipeType {
    All,
    Device,
    Conversation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WipeRequest {
    pub wipe_type: WipeType,
    pub target_device_id: Option<Uuid>,
    pub conversation_partner_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WipeAckDto {
    pub wipe_id: String,
    pub device_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WipeStatusResponse {
    pub wipe_id: String,
    pub pending_devices: Vec<Uuid>,
    pub confirmed_devices: Vec<Uuid>,
}
