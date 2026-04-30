use std::sync::Arc;

use axum::extract::{Query, State};
use axum::Json;

use hysj_shared::dto::settings::*;
use hysj_shared::pagination::PaginationParams;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// GET /api/settings — get user settings
pub async fn get_settings(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<UserSettingsDto>, AppError> {
    let s = hysj_db::settings::get_or_create(&state.db, auth.user_id).await?;

    Ok(Json(UserSettingsDto {
        read_receipts_enabled: s.read_receipts_enabled,
        typing_indicators_enabled: s.typing_indicators_enabled,
        last_active_visible: s.last_active_visible,
    }))
}

/// PUT /api/settings — update user settings
pub async fn update_settings(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<UpdateSettingsRequest>,
) -> Result<Json<UserSettingsDto>, AppError> {
    let s = hysj_db::settings::update(
        &state.db,
        auth.user_id,
        req.read_receipts_enabled,
        req.typing_indicators_enabled,
        req.last_active_visible,
    )
    .await?;

    Ok(Json(UserSettingsDto {
        read_receipts_enabled: s.read_receipts_enabled,
        typing_indicators_enabled: s.typing_indicators_enabled,
        last_active_visible: s.last_active_visible,
    }))
}

/// POST /api/settings/mute — mute a chat
pub async fn mute_chat(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<MuteChatRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if req.muted {
        hysj_db::settings::mute_chat(&state.db, auth.user_id, req.target_id).await?;
    } else {
        hysj_db::settings::unmute_chat(&state.db, auth.user_id, req.target_id).await?;
    }

    Ok(Json(serde_json::json!({ "status": "ok" })))
}

/// GET /api/settings/muted — list muted chats
pub async fn list_muted(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Query(pagination): Query<PaginationParams>,
) -> Result<Json<Vec<MutedChatDto>>, AppError> {
    let muted = hysj_db::settings::get_muted_chats_paginated(
        &state.db,
        auth.user_id,
        pagination.limit,
        pagination.offset,
    )
    .await?;

    Ok(Json(
        muted
            .into_iter()
            .map(|m| MutedChatDto {
                target_id: m.target_id,
                muted: true,
            })
            .collect(),
    ))
}
