use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Voice type used for AI voice transformation.
/// The actual transformation happens client-side before encryption.
/// This enum is stored in the encrypted payload so the recipient
/// knows which voice model was used (for UI display).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum VoiceType {
    /// Robot/synthetic voice
    Robot,
    /// Deep pitched voice
    Deep,
    /// High pitched voice
    High,
    /// Whisper effect
    Whisper,
    /// Distorted/anonymous voice
    Distorted,
    /// Custom AI voice model (future: user can pick from a set)
    Custom(String),
}

/// Request to upload an encrypted audio blob.
/// The audio is already voice-transformed + encrypted by the client.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioUploadRequest {
    /// Who this audio is for (used for Redis key scoping)
    pub recipient_device_id: Uuid,
    /// Duration in seconds (plaintext — for server-side validation only)
    pub duration_seconds: u32,
    /// Size in bytes of the encrypted blob
    pub blob_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioUploadResponse {
    /// Unique ID for this audio blob
    pub audio_id: String,
    /// URL to PUT the encrypted audio bytes
    pub upload_url: String,
}

/// Request to download an encrypted audio blob.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioMeta {
    pub audio_id: String,
    pub duration_seconds: u32,
    pub blob_size: u64,
}
