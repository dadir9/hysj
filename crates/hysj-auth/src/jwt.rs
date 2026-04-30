use chrono::Utc;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use hysj_shared::constants::{ACCESS_TOKEN_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_SECONDS};

use crate::AuthError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// User ID (subject)
    pub sub: String,
    /// Device UUID
    pub device_id: String,
    /// Username
    pub username: String,
    /// Expiry timestamp (seconds since epoch)
    pub exp: usize,
    /// Issued-at timestamp (seconds since epoch)
    pub iat: usize,
}

/// Create a short-lived access token (15 minutes).
pub fn create_access_token(
    user_id: Uuid,
    device_id: Uuid,
    username: &str,
    secret: &str,
) -> Result<String, AuthError> {
    let now = Utc::now().timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        device_id: device_id.to_string(),
        username: username.to_string(),
        exp: now + ACCESS_TOKEN_EXPIRY_SECONDS as usize,
        iat: now,
    };

    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AuthError::TokenCreationFailed(e.to_string()))
}

/// Create a long-lived refresh token (30 days).
pub fn create_refresh_token(
    user_id: Uuid,
    device_id: Uuid,
    username: &str,
    secret: &str,
) -> Result<String, AuthError> {
    let now = Utc::now().timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        device_id: device_id.to_string(),
        username: username.to_string(),
        exp: now + REFRESH_TOKEN_EXPIRY_SECONDS as usize,
        iat: now,
    };

    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AuthError::TokenCreationFailed(e.to_string()))
}

/// Validate and decode a JWT token, returning the claims if valid.
pub fn validate_token(token: &str, secret: &str) -> Result<Claims, AuthError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::Expired,
        jsonwebtoken::errors::ErrorKind::InvalidToken => AuthError::InvalidToken,
        _ => AuthError::TokenValidationFailed(e.to_string()),
    })?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_and_validate_access_token() {
        let user_id = Uuid::new_v4();
        let device_id = Uuid::new_v4();
        let secret = "test-secret-key-for-jwt";

        let token =
            create_access_token(user_id, device_id, "alice", secret).unwrap();

        let claims = validate_token(&token, secret).unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.device_id, device_id.to_string());
        assert_eq!(claims.username, "alice");
    }

    #[test]
    fn test_create_and_validate_refresh_token() {
        let user_id = Uuid::new_v4();
        let device_id = Uuid::new_v4();
        let secret = "test-secret-key-for-jwt";

        let token =
            create_refresh_token(user_id, device_id, "bob", secret).unwrap();

        let claims = validate_token(&token, secret).unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.username, "bob");
    }

    #[test]
    fn test_invalid_secret_fails_validation() {
        let user_id = Uuid::new_v4();
        let device_id = Uuid::new_v4();

        let token =
            create_access_token(user_id, device_id, "alice", "secret1").unwrap();

        let result = validate_token(&token, "secret2");
        assert!(result.is_err());
    }
}
