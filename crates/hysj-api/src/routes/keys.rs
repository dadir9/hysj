use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use uuid::Uuid;

use hysj_shared::dto::keys::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// GET /api/keys/:user_id
pub async fn get_pre_key_bundle(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(user_id): Path<Uuid>,
) -> Result<Json<PreKeyBundleResponse>, AppError> {
    let bundle = hysj_db::keys::get_pre_key_bundle(&state.db, user_id)
        .await
        .map_err(|e| match e {
            hysj_db::DbError::NotFound => AppError(HysjError::UserNotFound(user_id)),
            other => AppError::from(other),
        })?;

    Ok(Json(PreKeyBundleResponse {
        identity_public_key: B64.encode(&bundle.identity_public_key),
        signed_pre_key: B64.encode(&bundle.signed_pre_key),
        signed_pre_key_signature: B64.encode(&bundle.signed_pre_key_sig),
        one_time_pre_key: bundle.one_time_pre_key.map(|k| B64.encode(&k)),
        kyber_public_key: B64.encode(&bundle.kyber_public_key),
    }))
}

/// POST /api/keys/replenish
pub async fn replenish_pre_keys(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<ReplenishPreKeysRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if req.pre_keys.is_empty() {
        return Err(AppError(HysjError::ValidationError(
            "Must provide at least one pre-key".into(),
        )));
    }

    let current = hysj_db::keys::count_available_pre_keys(&state.db, auth.device_id).await?;
    let max = hysj_shared::constants::MAX_PRE_KEYS_PER_DEVICE as i64;

    if current + req.pre_keys.len() as i64 > max {
        return Err(AppError(HysjError::ValidationError(format!(
            "Would exceed max pre-keys ({}/{})",
            current + req.pre_keys.len() as i64,
            max
        ))));
    }

    let keys: Result<Vec<Vec<u8>>, _> = req.pre_keys.iter().map(|k| B64.decode(k)).collect();
    let keys = keys.map_err(|e| {
        AppError(HysjError::ValidationError(format!("Invalid pre-key base64: {}", e)))
    })?;

    let stored = hysj_db::keys::store_pre_keys(&state.db, auth.device_id, &keys).await?;

    tracing::info!(device_id = %auth.device_id, count = stored, "Replenished pre-keys");

    Ok(Json(serde_json::json!({ "stored": stored })))
}
