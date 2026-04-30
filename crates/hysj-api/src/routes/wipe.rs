use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

use hysj_shared::dto::messages::WsMessage;
use hysj_shared::dto::wipe::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;
use crate::ws::connection_tracker;

/// POST /api/wipe
pub async fn issue_wipe(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<WipeRequest>,
) -> Result<Json<WipeStatusResponse>, AppError> {
    let target_devices: Vec<Uuid> = match &req.wipe_type {
        WipeType::All => {
            let devices = hysj_db::devices::list_by_user(&state.db, auth.user_id).await?;
            devices.into_iter().map(|d| d.id).collect()
        }
        WipeType::Device => {
            let device_id = req.target_device_id.ok_or_else(|| {
                AppError(HysjError::ValidationError(
                    "target_device_id required for Device wipe".into(),
                ))
            })?;
            vec![device_id]
        }
        WipeType::Conversation => {
            let partner_id = req.conversation_partner_id.ok_or_else(|| {
                AppError(HysjError::ValidationError(
                    "conversation_partner_id required for Conversation wipe".into(),
                ))
            })?;
            let devices = hysj_db::devices::list_by_user(&state.db, partner_id).await?;
            let mut ids: Vec<Uuid> = devices.into_iter().map(|d| d.id).collect();
            let own_devices = hysj_db::devices::list_by_user(&state.db, auth.user_id).await?;
            ids.extend(own_devices.into_iter().map(|d| d.id));
            ids
        }
    };

    if target_devices.is_empty() {
        return Err(AppError(HysjError::ValidationError(
            "No target devices found".into(),
        )));
    }

    let mut redis = state.redis.clone();
    let wipe_id =
        hysj_messaging::wipe::issue_wipe(&mut redis, &target_devices, &req).await?;

    let ws_msg = WsMessage::WipeCommand(req);
    for device_id in &target_devices {
        let _ = connection_tracker::send_to_device(&state.connections, *device_id, &ws_msg);
    }

    tracing::info!(
        wipe_id = %wipe_id,
        target_count = target_devices.len(),
        issuer = %auth.user_id,
        "Wipe issued"
    );

    Ok(Json(WipeStatusResponse {
        wipe_id,
        pending_devices: target_devices,
        confirmed_devices: vec![],
    }))
}

/// GET /api/wipe/:wipe_id
pub async fn wipe_status(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(wipe_id): Path<String>,
) -> Result<Json<WipeStatusResponse>, AppError> {
    let devices = hysj_db::devices::list_by_user(&state.db, auth.user_id).await?;

    let mut pending = Vec::new();
    let mut confirmed = Vec::new();
    let mut redis = state.redis.clone();

    for device in &devices {
        let wipes = hysj_messaging::wipe::get_pending_wipes(&mut redis, device.id).await?;
        let still_pending = wipes.iter().any(|w| w.wipe_id == wipe_id);
        if still_pending {
            pending.push(device.id);
        } else {
            confirmed.push(device.id);
        }
    }

    Ok(Json(WipeStatusResponse {
        wipe_id,
        pending_devices: pending,
        confirmed_devices: confirmed,
    }))
}
