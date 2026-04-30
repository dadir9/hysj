use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;

use hysj_shared::dto::groups::*;
use hysj_shared::error::HysjError;
use hysj_shared::pagination::PaginationParams;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// POST /api/groups
pub async fn create_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<CreateGroupRequest>,
) -> Result<Json<GroupResponse>, AppError> {
    if req.name.is_empty() || req.name.len() > 64 {
        return Err(AppError(HysjError::ValidationError(
            "Group name must be 1-64 characters".into(),
        )));
    }

    let group =
        hysj_db::groups::create_group(&state.db, &req.name, auth.user_id, req.is_anonymous)
            .await?;

    hysj_db::groups::add_member(&state.db, group.id, auth.user_id, "admin").await?;

    for member_id in &req.member_ids {
        if *member_id != auth.user_id {
            hysj_db::groups::add_member(&state.db, group.id, *member_id, "member").await?;
        }
    }

    let response = build_group_response(&state, group.id).await?;

    tracing::info!(group_id = %group.id, creator = %auth.user_id, "Group created");

    Ok(Json(response))
}

/// GET /api/groups
pub async fn list_groups(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Query(pagination): Query<PaginationParams>,
) -> Result<Json<Vec<GroupResponse>>, AppError> {
    let groups = hysj_db::groups::list_groups_for_user_paginated(
        &state.db,
        auth.user_id,
        pagination.limit,
        pagination.offset,
    )
    .await?;

    let mut responses = Vec::with_capacity(groups.len());
    for group in groups {
        let response = build_group_response(&state, group.id).await?;
        responses.push(response);
    }

    Ok(Json(responses))
}

/// GET /api/groups/:group_id
pub async fn get_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<GroupResponse>, AppError> {
    let is_member = hysj_db::groups::is_member(&state.db, group_id, auth.user_id).await?;
    if !is_member {
        return Err(AppError(HysjError::GroupNotFound(group_id)));
    }

    let response = build_group_response(&state, group_id).await?;
    Ok(Json(response))
}

/// POST /api/groups/:group_id/members — admin only
pub async fn add_member(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(req): Json<AddMemberRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let role = hysj_db::groups::get_member_role(&state.db, group_id, auth.user_id).await?;
    match role.as_deref() {
        Some("admin") => {}
        Some(_) => {
            return Err(AppError(HysjError::Forbidden(
                "Only group admins can add members".into(),
            )));
        }
        None => {
            return Err(AppError(HysjError::GroupNotFound(group_id)));
        }
    }

    hysj_db::groups::add_member(&state.db, group_id, req.user_id, "member").await?;

    tracing::info!(
        group_id = %group_id,
        added_user = %req.user_id,
        by_user = %auth.user_id,
        "Member added to group"
    );

    Ok(Json(serde_json::json!({ "added": true })))
}

/// DELETE /api/groups/:group_id/members/:user_id — admin only
pub async fn remove_member(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path((group_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>, AppError> {
    let role = hysj_db::groups::get_member_role(&state.db, group_id, auth.user_id).await?;
    match role.as_deref() {
        Some("admin") => {}
        Some(_) => {
            return Err(AppError(HysjError::Forbidden(
                "Only group admins can remove members".into(),
            )));
        }
        None => {
            return Err(AppError(HysjError::GroupNotFound(group_id)));
        }
    }

    if user_id == auth.user_id {
        return Err(AppError(HysjError::ValidationError(
            "Cannot remove yourself; use leave instead".into(),
        )));
    }

    let removed = hysj_db::groups::remove_member(&state.db, group_id, user_id).await?;

    if !removed {
        return Err(AppError(HysjError::ValidationError(
            "User is not a member of this group".into(),
        )));
    }

    tracing::info!(
        group_id = %group_id,
        removed_user = %user_id,
        by_user = %auth.user_id,
        "Member removed from group"
    );

    Ok(Json(serde_json::json!({ "removed": true })))
}

/// POST /api/groups/:group_id/leave — leave a group
pub async fn leave_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let removed = hysj_db::groups::remove_member(&state.db, group_id, auth.user_id).await?;

    if !removed {
        return Err(AppError(HysjError::GroupNotFound(group_id)));
    }

    tracing::info!(
        group_id = %group_id,
        user_id = %auth.user_id,
        "User left group"
    );

    Ok(Json(serde_json::json!({ "left": true })))
}

/// DELETE /api/groups/:group_id — delete group (admin only)
pub async fn delete_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let role = hysj_db::groups::get_member_role(&state.db, group_id, auth.user_id).await?;
    match role.as_deref() {
        Some("admin") => {}
        Some(_) => {
            return Err(AppError(HysjError::Forbidden(
                "Only group admins can delete the group".into(),
            )));
        }
        None => {
            return Err(AppError(HysjError::GroupNotFound(group_id)));
        }
    }

    let deleted = hysj_db::groups::delete_group(&state.db, group_id).await?;

    if !deleted {
        return Err(AppError(HysjError::GroupNotFound(group_id)));
    }

    tracing::info!(
        group_id = %group_id,
        by_user = %auth.user_id,
        "Group deleted"
    );

    Ok(Json(serde_json::json!({ "deleted": true })))
}

/// PUT /api/groups/:group_id — update group name (admin only)
pub async fn update_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(req): Json<UpdateGroupNameRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if req.name.is_empty() || req.name.len() > 64 {
        return Err(AppError(HysjError::ValidationError(
            "Group name must be 1-64 characters".into(),
        )));
    }

    let role = hysj_db::groups::get_member_role(&state.db, group_id, auth.user_id).await?;
    match role.as_deref() {
        Some("admin") => {}
        Some(_) => {
            return Err(AppError(HysjError::Forbidden(
                "Only group admins can update the group".into(),
            )));
        }
        None => {
            return Err(AppError(HysjError::GroupNotFound(group_id)));
        }
    }

    hysj_db::groups::update_group_name(&state.db, group_id, &req.name).await?;

    tracing::info!(
        group_id = %group_id,
        by_user = %auth.user_id,
        "Group name updated"
    );

    Ok(Json(serde_json::json!({ "status": "group_updated" })))
}

async fn build_group_response(
    state: &AppState,
    group_id: Uuid,
) -> Result<GroupResponse, AppError> {
    let group = hysj_db::groups::find_by_id(&state.db, group_id)
        .await
        .map_err(|_| AppError(HysjError::GroupNotFound(group_id)))?;

    let members = hysj_db::groups::get_members(&state.db, group_id).await?;

    let member_dtos: Vec<GroupMemberDto> = members
        .into_iter()
        .map(|m| GroupMemberDto {
            user_id: m.user_id,
            alias_name: m.alias_name,
            alias_color: m.alias_color,
            role: m.role,
            joined_at: m.joined_at,
        })
        .collect();

    Ok(GroupResponse {
        id: group.id,
        name: group.name,
        is_anonymous: group.is_anonymous,
        members: member_dtos,
        created_at: group.created_at,
    })
}
