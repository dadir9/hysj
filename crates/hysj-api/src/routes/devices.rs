use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct DeviceDto {
    pub id: Uuid,
    pub device_name: String,
    pub is_online: bool,
    pub last_active_at: DateTime<Utc>,
    pub registered_at: DateTime<Utc>,
}

/// GET /api/devices
pub async fn list_devices(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<Vec<DeviceDto>>, AppError> {
    let devices = hysj_db::devices::list_by_user(&state.db, auth.user_id).await?;

    let dtos: Vec<DeviceDto> = devices
        .into_iter()
        .map(|d| DeviceDto {
            id: d.id,
            device_name: d.device_name,
            is_online: d.is_online,
            last_active_at: d.last_active_at,
            registered_at: d.registered_at,
        })
        .collect();

    Ok(Json(dtos))
}

/// DELETE /api/devices/:device_id
pub async fn delete_device(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(device_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    if device_id == auth.device_id {
        return Err(AppError(HysjError::ValidationError(
            "Cannot delete the device you are currently using".into(),
        )));
    }

    let deleted = hysj_db::devices::delete_device(&state.db, device_id, auth.user_id).await?;

    if !deleted {
        return Err(AppError(HysjError::DeviceNotFound(device_id)));
    }

    state.connections.remove(&device_id);

    tracing::info!(user_id = %auth.user_id, device_id = %device_id, "Device deleted");

    Ok(Json(serde_json::json!({ "deleted": true })))
}
