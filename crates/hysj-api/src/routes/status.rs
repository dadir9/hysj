use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

use hysj_shared::dto::contacts::OnlineStatusDto;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// GET /api/users/:user_id/status — get online status for a user
pub async fn get_status(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(target_user_id): Path<Uuid>,
) -> Result<Json<OnlineStatusDto>, AppError> {
    // Check if user is a contact (privacy: only contacts can see status)
    let contact = hysj_db::contacts::get_contact(&state.db, auth.user_id, target_user_id).await?;
    if contact.is_none() {
        return Err(AppError(HysjError::UserNotFound(target_user_id)));
    }

    // Check target's privacy settings
    let settings = hysj_db::settings::get_or_create(&state.db, target_user_id).await?;
    if !settings.last_active_visible {
        return Err(AppError(HysjError::UserNotFound(target_user_id)));
    }

    let user = hysj_db::users::find_by_id(&state.db, target_user_id)
        .await?
        .ok_or(AppError(HysjError::UserNotFound(target_user_id)))?;

    // Check if any device is online
    let devices = hysj_db::devices::list_by_user(&state.db, target_user_id)
        .await
        .unwrap_or_default();
    let is_online = devices.iter().any(|d| state.connections.contains_key(&d.id));

    Ok(Json(OnlineStatusDto {
        user_id: target_user_id,
        is_online,
        last_active_at: user.last_seen_at,
    }))
}
