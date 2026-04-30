use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum HysjError {
    #[error("Authentication failed: {0}")]
    AuthFailed(String),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("User not found: {0}")]
    UserNotFound(Uuid),

    #[error("Device not found: {0}")]
    DeviceNotFound(Uuid),

    #[error("Group not found: {0}")]
    GroupNotFound(Uuid),

    #[error("Pre-key exhausted for device: {0}")]
    PreKeyExhausted(Uuid),

    #[error("Rate limit exceeded")]
    RateLimited,

    #[error("2FA required")]
    TwoFactorRequired,

    #[error("Invalid 2FA code")]
    InvalidTwoFactorCode,

    #[error("Token expired")]
    TokenExpired,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Wipe failed: {0}")]
    WipeFailed(String),

    #[error("Crypto error: {0}")]
    CryptoError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Redis error: {0}")]
    RedisError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("Internal server error")]
    Internal,
}
