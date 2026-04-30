/// Redis TTL for queued messages (72 hours)
pub const MESSAGE_TTL_SECONDS: u64 = 72 * 60 * 60;

/// Redis TTL for wipe commands (30 days)
pub const WIPE_TTL_SECONDS: u64 = 30 * 24 * 60 * 60;

/// JWT access token expiry (15 minutes)
pub const ACCESS_TOKEN_EXPIRY_SECONDS: u64 = 15 * 60;

/// JWT refresh token expiry (30 days)
pub const REFRESH_TOKEN_EXPIRY_SECONDS: u64 = 30 * 24 * 60 * 60;

/// Sender certificate validity (24 hours)
pub const SENDER_CERT_EXPIRY_SECONDS: u64 = 24 * 60 * 60;

/// Message expiry sweep interval (30 minutes)
pub const EXPIRY_SWEEP_INTERVAL_SECONDS: u64 = 30 * 60;

/// Max skipped message keys in Double Ratchet
pub const MAX_SKIPPED_KEYS: usize = 1000;

/// Max one-time pre-keys per device
pub const MAX_PRE_KEYS_PER_DEVICE: usize = 100;

/// File chunk size for encrypted file transfer (64 KB)
pub const FILE_CHUNK_SIZE: usize = 64 * 1024;

/// Max file size (100 MB)
pub const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024;

/// Max audio message duration (5 minutes)
pub const MAX_AUDIO_DURATION_SECONDS: u32 = 5 * 60;

/// Max audio file size (10 MB — Opus-encoded voice is ~1 MB/min)
pub const MAX_AUDIO_SIZE: u64 = 10 * 1024 * 1024;

/// Audio file TTL in Redis — same as messages (72 hours) for unplayed audio
pub const AUDIO_TTL_SECONDS: u64 = MESSAGE_TTL_SECONDS;

/// Audio auto-delete after played/seen (3 minutes)
pub const AUDIO_SEEN_TTL_SECONDS: u64 = 3 * 60;

/// Rate limits
pub mod rate_limits {
    pub const LOGIN_MAX: u32 = 5;
    pub const LOGIN_WINDOW_SECONDS: u64 = 15 * 60;
    pub const LOGIN_LOCKOUT_SECONDS: u64 = 30 * 60;

    pub const REGISTER_MAX: u32 = 3;
    pub const REGISTER_WINDOW_SECONDS: u64 = 60 * 60;

    pub const MESSAGE_MAX: u32 = 60;
    pub const MESSAGE_WINDOW_SECONDS: u64 = 60;

    pub const AUDIO_UPLOAD_MAX: u32 = 20;
    pub const AUDIO_UPLOAD_WINDOW_SECONDS: u64 = 60;

    pub const FILE_UPLOAD_MAX: u32 = 10;
    pub const FILE_UPLOAD_WINDOW_SECONDS: u64 = 60;

    pub const WIPE_MAX: u32 = 3;
    pub const WIPE_WINDOW_SECONDS: u64 = 60 * 60;

    pub const PREKEY_FETCH_MAX: u32 = 30;
    pub const PREKEY_FETCH_WINDOW_SECONDS: u64 = 60;
}

/// OTP code length
pub const OTP_CODE_LENGTH: usize = 6;

/// OTP expiry (5 minutes)
pub const OTP_EXPIRY_SECONDS: u64 = 5 * 60;

/// OTP verification token expiry (10 minutes)
pub const OTP_VERIFICATION_TOKEN_EXPIRY_SECONDS: u64 = 10 * 60;

/// Protocol version
pub const PROTOCOL_VERSION: &str = "hysj-v2";

/// Onion routing hop count
pub const ONION_HOP_COUNT: usize = 3;
