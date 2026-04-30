use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: Option<String>,
    pub phone_number: String,
    pub password: String,
    /// Base64-encoded identity public key
    pub identity_public_key: String,
    pub signed_pre_key: String,
    pub signed_pre_key_signature: String,
    pub kyber_public_key: String,
    pub one_time_pre_keys: Vec<String>,
    pub device_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub phone_number: String,
    pub password: String,
    pub device_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: Uuid,
    pub device_id: Uuid,
    pub requires_2fa: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoFactorSetupResponse {
    pub secret: String,
    pub qr_uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoFactorVerifyRequest {
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SenderCertificateResponse {
    pub certificate: String,
    pub server_public_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetUsernameRequest {
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetDisplayNameRequest {
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsernameAvailableResponse {
    pub username: String,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetAvatarRequest {
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetStatusRequest {
    pub status: String,
}

// --- SMS OTP Verification ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendOtpRequest {
    pub phone_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendOtpResponse {
    pub message: String,
    /// Seconds until OTP expires
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyOtpRequest {
    pub phone_number: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyOtpResponse {
    pub verified: bool,
    /// Short-lived token proving phone ownership (used in register)
    pub verification_token: Option<String>,
}
