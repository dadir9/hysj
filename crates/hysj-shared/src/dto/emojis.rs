use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmojiPackRequest {
    pub name: String,
    pub description: Option<String>,
    pub is_premium: bool,
    pub price_cents: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmojiPackDto {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub cover_image_url: Option<String>,
    pub is_premium: bool,
    pub price_cents: Option<i32>,
    pub emoji_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmojiDto {
    pub id: Uuid,
    pub shortcode: String,
    pub image_url: String,
    pub is_animated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddEmojiRequest {
    pub shortcode: String,
    pub image_url: String,
    pub is_animated: bool,
}
