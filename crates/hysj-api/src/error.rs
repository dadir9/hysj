use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

use hysj_shared::error::HysjError;

/// Application-level error type that maps to HTTP responses.
#[derive(Debug)]
pub struct AppError(pub HysjError);

impl From<HysjError> for AppError {
    fn from(e: HysjError) -> Self {
        AppError(e)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self.0 {
            HysjError::AuthFailed(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            HysjError::InvalidCredentials => {
                (StatusCode::UNAUTHORIZED, "Invalid credentials".to_string())
            }
            HysjError::UserNotFound(id) => {
                (StatusCode::NOT_FOUND, format!("User not found: {}", id))
            }
            HysjError::DeviceNotFound(id) => {
                (StatusCode::NOT_FOUND, format!("Device not found: {}", id))
            }
            HysjError::GroupNotFound(id) => {
                (StatusCode::NOT_FOUND, format!("Group not found: {}", id))
            }
            HysjError::PreKeyExhausted(id) => (
                StatusCode::GONE,
                format!("Pre-keys exhausted for device: {}", id),
            ),
            HysjError::RateLimited => {
                (StatusCode::TOO_MANY_REQUESTS, "Rate limit exceeded".to_string())
            }
            HysjError::TwoFactorRequired => {
                (StatusCode::FORBIDDEN, "2FA required".to_string())
            }
            HysjError::InvalidTwoFactorCode => {
                (StatusCode::UNAUTHORIZED, "Invalid 2FA code".to_string())
            }
            HysjError::TokenExpired => {
                (StatusCode::UNAUTHORIZED, "Token expired".to_string())
            }
            HysjError::InvalidToken => {
                (StatusCode::UNAUTHORIZED, "Invalid token".to_string())
            }
            HysjError::WipeFailed(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, msg.clone())
            }
            HysjError::CryptoError(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, msg.clone())
            }
            HysjError::DatabaseError(msg) => {
                tracing::error!(error = %msg, "Database error");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            HysjError::RedisError(msg) => {
                tracing::error!(error = %msg, "Redis error");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            HysjError::ValidationError(msg) => {
                (StatusCode::BAD_REQUEST, msg.clone())
            }
            HysjError::Forbidden(msg) => {
                (StatusCode::FORBIDDEN, msg.clone())
            }
            HysjError::NotFound(msg) => {
                (StatusCode::NOT_FOUND, msg.clone())
            }
            HysjError::InternalError(msg) => {
                tracing::error!(error = %msg, "Internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            HysjError::Internal => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
        };

        let body = axum::Json(json!({ "error": message }));
        (status, body).into_response()
    }
}

/// Convenience conversion from sqlx errors.
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError(HysjError::DatabaseError(e.to_string()))
    }
}

/// Convenience conversion from hysj_db errors.
impl From<hysj_db::DbError> for AppError {
    fn from(e: hysj_db::DbError) -> Self {
        match e {
            hysj_db::DbError::NotFound => AppError(HysjError::Internal),
            hysj_db::DbError::Conflict(msg) => AppError(HysjError::ValidationError(msg)),
            hysj_db::DbError::QueryFailed(msg) => AppError(HysjError::DatabaseError(msg)),
        }
    }
}

/// Convenience conversion from hysj_auth errors.
impl From<hysj_auth::AuthError> for AppError {
    fn from(e: hysj_auth::AuthError) -> Self {
        match e {
            hysj_auth::AuthError::Expired => AppError(HysjError::TokenExpired),
            hysj_auth::AuthError::InvalidToken => AppError(HysjError::InvalidToken),
            hysj_auth::AuthError::TokenValidationFailed(msg) => {
                AppError(HysjError::AuthFailed(msg))
            }
            other => AppError(HysjError::AuthFailed(other.to_string())),
        }
    }
}

/// Convenience conversion from hysj_messaging errors.
impl From<hysj_messaging::MessagingError> for AppError {
    fn from(e: hysj_messaging::MessagingError) -> Self {
        AppError(HysjError::RedisError(e.to_string()))
    }
}
