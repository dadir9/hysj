use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;

use hysj_shared::dto::contacts::*;
use hysj_shared::error::HysjError;
use hysj_shared::pagination::PaginationParams;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// GET /api/contacts — list all contacts with enriched user info
pub async fn list_contacts(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Query(pagination): Query<PaginationParams>,
) -> Result<Json<Vec<ContactDto>>, AppError> {
    let contacts = hysj_db::contacts::get_contacts_paginated(
        &state.db,
        auth.user_id,
        pagination.limit,
        pagination.offset,
    )
    .await?;

    let mut dtos = Vec::with_capacity(contacts.len());
    for c in contacts {
        let user = hysj_db::users::find_by_id(&state.db, c.contact_user_id)
            .await?
            .ok_or(AppError(HysjError::UserNotFound(c.contact_user_id)))?;

        dtos.push(ContactDto {
            user_id: c.contact_user_id,
            username: user.username,
            display_name: user.display_name,
            nickname: c.nickname,
            is_blocked: c.is_blocked,
        });
    }

    Ok(Json(dtos))
}

/// POST /api/contacts/:user_id — add a contact
pub async fn add_contact(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(contact_user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    if auth.user_id == contact_user_id {
        return Err(AppError(HysjError::ValidationError(
            "Cannot add yourself as a contact".into(),
        )));
    }

    // Verify the target user exists
    hysj_db::users::find_by_id(&state.db, contact_user_id)
        .await?
        .ok_or(AppError(HysjError::UserNotFound(contact_user_id)))?;

    hysj_db::contacts::add_contact(&state.db, auth.user_id, contact_user_id).await?;

    Ok(Json(serde_json::json!({ "status": "contact_added" })))
}

/// DELETE /api/contacts/:user_id — remove a contact
pub async fn remove_contact(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(contact_user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    hysj_db::contacts::remove_contact(&state.db, auth.user_id, contact_user_id).await?;

    Ok(Json(serde_json::json!({ "status": "contact_removed" })))
}

/// PUT /api/contacts/:user_id/nickname — set nickname for a contact
pub async fn set_nickname(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(contact_user_id): Path<Uuid>,
    Json(req): Json<SetNicknameRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if let Some(ref nick) = req.nickname {
        if nick.len() > 64 {
            return Err(AppError(HysjError::ValidationError(
                "Nickname must be at most 64 characters".into(),
            )));
        }
    }

    hysj_db::contacts::set_nickname(
        &state.db,
        auth.user_id,
        contact_user_id,
        req.nickname.as_deref(),
    )
    .await?;

    Ok(Json(serde_json::json!({ "status": "nickname_set" })))
}

/// POST /api/contacts/:user_id/block — block a user
pub async fn block_contact(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(contact_user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Verify the target user exists
    hysj_db::users::find_by_id(&state.db, contact_user_id)
        .await?
        .ok_or(AppError(HysjError::UserNotFound(contact_user_id)))?;

    hysj_db::contacts::block_contact(&state.db, auth.user_id, contact_user_id).await?;

    Ok(Json(serde_json::json!({ "status": "contact_blocked" })))
}

/// POST /api/contacts/:user_id/unblock — unblock a user
pub async fn unblock_contact(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(contact_user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    hysj_db::contacts::unblock_contact(&state.db, auth.user_id, contact_user_id).await?;

    Ok(Json(serde_json::json!({ "status": "contact_unblocked" })))
}
