use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileUploadInitRequest {
    pub file_name: String,
    pub file_size: u64,
    pub chunk_count: u32,
    pub recipient_device_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileUploadInitResponse {
    pub file_id: String,
    pub upload_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetaResponse {
    pub file_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub chunk_count: u32,
    pub uploaded_at: DateTime<Utc>,
}
