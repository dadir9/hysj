use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;

use hysj_shared::dto::contacts::ContactRequestDto;
use hysj_shared::error::HysjError;
use hysj_shared::pagination::PaginationParams;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// POST /api/contact-requests/:user_id — send a contact request
pub async fn send_request(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(to_user_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    if auth.user_id == to_user_id {
        return Err(AppError(HysjError::ValidationError(
            "Cannot send request to yourself".into(),
        )));
    }

    hysj_db::users::find_by_id(&state.db, to_user_id)
        .await?
        .ok_or(AppError(HysjError::UserNotFound(to_user_id)))?;

    hysj_db::contact_requests::send_request(&state.db, auth.user_id, to_user_id).await?;

    Ok(Json(serde_json::json!({ "status": "request_sent" })))
}

/// GET /api/contact-requests/incoming — list pending requests received
pub async fn list_incoming(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Query(pagination): Query<PaginationParams>,
) -> Result<Json<Vec<ContactRequestDto>>, AppError> {
    let requests = hysj_db::contact_requests::get_pending_paginated(
        &state.db,
        auth.user_id,
        pagination.limit,
        pagination.offset,
    )
    .await?;

    let mut dtos = Vec::with_capacity(requests.len());
    for req in requests {
        if let Some(user) = hysj_db::users::find_by_id(&state.db, req.from_user_id).await? {
            dtos.push(ContactRequestDto {
                id: req.id,
                from_user_id: req.from_user_id,
                from_username: user.username,
                from_display_name: user.display_name,
                created_at: req.created_at,
            });
        }
    }

    Ok(Json(dtos))
}

/// POST /api/contact-requests/:request_id/accept — accept and create mutual contacts
pub async fn accept_request(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(request_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let req = hysj_db::contact_requests::accept(&state.db, request_id, auth.user_id).await?;

    // Create mutual contact relationship
    let _ = hysj_db::contacts::add_contact(&state.db, auth.user_id, req.from_user_id).await;
    let _ = hysj_db::contacts::add_contact(&state.db, req.from_user_id, auth.user_id).await;

    Ok(Json(serde_json::json!({ "status": "request_accepted" })))
}

/// POST /api/contact-requests/:request_id/reject — reject a contact request
pub async fn reject_request(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(request_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    hysj_db::contact_requests::reject(&state.db, request_id, auth.user_id).await?;

    Ok(Json(serde_json::json!({ "status": "request_rejected" })))
}
