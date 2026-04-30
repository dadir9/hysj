use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterPushTokenRequest {
    /// FCM or APNs token
    pub push_token: String,
    /// "fcm" or "apns"
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushTokenResponse {
    pub message: String,
}

/// POST /api/push/register
///
/// Register a push notification token for the current device.
pub async fn register_push_token(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<RegisterPushTokenRequest>,
) -> Result<Json<PushTokenResponse>, AppError> {
    if req.push_token.is_empty() {
        return Err(AppError(HysjError::ValidationError(
            "Push token cannot be empty".into(),
        )));
    }

    if req.platform != "fcm" && req.platform != "apns" {
        return Err(AppError(HysjError::ValidationError(
            "Platform must be 'fcm' or 'apns'".into(),
        )));
    }

    // Store push token in Redis (keyed by device_id)
    let mut redis = state.redis.clone();
    let key = format!("push:{}:{}", auth.device_id, req.platform);

    redis::cmd("SET")
        .arg(&key)
        .arg(&req.push_token)
        .query_async::<()>(&mut redis)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    tracing::info!(
        device_id = %auth.device_id,
        platform = %req.platform,
        "Push token registered"
    );

    Ok(Json(PushTokenResponse {
        message: "Push token registered".into(),
    }))
}

/// POST /api/push/unregister
///
/// Remove push token for current device.
pub async fn unregister_push_token(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<PushTokenResponse>, AppError> {
    let mut redis = state.redis.clone();

    // Remove both FCM and APNs tokens
    for platform in &["fcm", "apns"] {
        let key = format!("push:{}:{}", auth.device_id, platform);
        let _: () = redis::cmd("DEL")
            .arg(&key)
            .query_async(&mut redis)
            .await
            .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;
    }

    tracing::info!(device_id = %auth.device_id, "Push tokens removed");

    Ok(Json(PushTokenResponse {
        message: "Push tokens removed".into(),
    }))
}

/// Send a push notification to a device (internal helper, not an endpoint).
pub async fn send_push_notification(
    redis: &mut redis::aio::MultiplexedConnection,
    fcm_server_key: &str,
    device_id: uuid::Uuid,
    title: &str,
    body: &str,
) -> Result<(), String> {
    // Try FCM first
    let fcm_key = format!("push:{}:fcm", device_id);
    let token: Option<String> = redis::cmd("GET")
        .arg(&fcm_key)
        .query_async(redis)
        .await
        .map_err(|e| e.to_string())?;

    let token = match token {
        Some(t) => t,
        None => return Ok(()), // No push token registered
    };

    let payload = serde_json::json!({
        "to": token,
        "notification": {
            "title": title,
            "body": body,
        },
        "data": {
            "type": "message",
        },
        "priority": "high",
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://fcm.googleapis.com/fcm/send")
        .header("Authorization", format!("key={}", fcm_server_key))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("FCM request failed: {}", e))?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        tracing::error!(device_id = %device_id, body = %text, "FCM push failed");
    } else {
        tracing::debug!(device_id = %device_id, "Push notification sent");
    }

    Ok(())
}
