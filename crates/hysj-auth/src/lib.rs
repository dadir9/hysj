pub mod password;
pub mod jwt;
pub mod totp;
pub mod certificate;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("password hashing failed: {0}")]
    HashingFailed(String),

    #[error("token creation failed: {0}")]
    TokenCreationFailed(String),

    #[error("token validation failed: {0}")]
    TokenValidationFailed(String),

    #[error("invalid token")]
    InvalidToken,

    #[error("token or certificate has expired")]
    Expired,

    #[error("TOTP error: {0}")]
    TotpError(String),

    #[error("certificate error: {0}")]
    CertificateError(String),
}
