use anyhow::Context;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub cert_signing_seed: [u8; 32],
    pub server_address: String,
    pub twilio: Option<TwilioConfig>,
    pub fcm_server_key: Option<String>,
    pub cors_origins: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct TwilioConfig {
    pub account_sid: String,
    pub auth_token: String,
    pub from_number: String,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url =
            std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
        let redis_url =
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
        let jwt_secret =
            std::env::var("JWT_SECRET").context("JWT_SECRET must be set")?;
        let server_address =
            std::env::var("SERVER_ADDRESS").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

        let cert_hex =
            std::env::var("CERT_SIGNING_KEY").context("CERT_SIGNING_KEY must be set (64 hex chars)")?;

        let cert_bytes = hex_to_bytes(&cert_hex)
            .context("CERT_SIGNING_KEY must be a 64-character hex string")?;
        let cert_signing_seed: [u8; 32] = cert_bytes
            .try_into()
            .map_err(|v: Vec<u8>| anyhow::anyhow!(
                "CERT_SIGNING_KEY must be exactly 32 bytes (64 hex chars), got {}",
                v.len()
            ))?;

        // Optional Twilio config
        let twilio = match (
            std::env::var("TWILIO_ACCOUNT_SID").ok(),
            std::env::var("TWILIO_AUTH_TOKEN").ok(),
            std::env::var("TWILIO_FROM_NUMBER").ok(),
        ) {
            (Some(sid), Some(token), Some(from)) => Some(TwilioConfig {
                account_sid: sid,
                auth_token: token,
                from_number: from,
            }),
            _ => None,
        };

        // Optional FCM server key
        let fcm_server_key = std::env::var("FCM_SERVER_KEY").ok();

        // CORS allowed origins (comma-separated, or empty for permissive in dev)
        let cors_origins: Vec<String> = std::env::var("CORS_ORIGINS")
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        Ok(Self {
            database_url,
            redis_url,
            jwt_secret,
            cert_signing_seed,
            server_address,
            twilio,
            fcm_server_key,
            cors_origins,
        })
    }
}

fn hex_to_bytes(hex: &str) -> anyhow::Result<Vec<u8>> {
    if hex.len() % 2 != 0 {
        anyhow::bail!("Hex string has odd length");
    }
    (0..hex.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&hex[i..i + 2], 16)
                .map_err(|e| anyhow::anyhow!("Invalid hex at position {}: {}", i, e))
        })
        .collect()
}
