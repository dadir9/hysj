pub mod media_store;
pub mod otp;
pub mod queue;
pub mod wipe;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum MessagingError {
    #[error("Redis error: {0}")]
    RedisError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Not found")]
    NotFound,
}

impl From<redis::RedisError> for MessagingError {
    fn from(e: redis::RedisError) -> Self {
        MessagingError::RedisError(e.to_string())
    }
}
