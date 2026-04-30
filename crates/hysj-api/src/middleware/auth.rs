use std::sync::Arc;

use async_trait::async_trait;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::error::AppError;
use crate::state::AppState;
use hysj_shared::error::HysjError;

/// Authenticated user extracted from the Authorization header.
///
/// Implement `FromRequestParts` so it can be used as an Axum extractor
/// in any handler that requires authentication.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub device_id: Uuid,
    pub username: String,
}

#[async_trait]
impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        // Extract the Authorization header
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError(HysjError::AuthFailed("Missing Authorization header".into())))?;

        // Must be Bearer token
        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError(HysjError::AuthFailed("Invalid Authorization format".into())))?;

        // Validate the JWT
        let claims = hysj_auth::jwt::validate_token(token, &state.config.jwt_secret)?;

        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError(HysjError::InvalidToken))?;
        let device_id = Uuid::parse_str(&claims.device_id)
            .map_err(|_| AppError(HysjError::InvalidToken))?;

        Ok(AuthUser {
            user_id,
            device_id,
            username: claims.username,
        })
    }
}
