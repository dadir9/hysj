use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

use hysj_shared::dto::emojis::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// POST /api/emojis/packs — create a new emoji pack (auth required)
pub async fn create_pack(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<CreateEmojiPackRequest>,
) -> Result<Json<EmojiPackDto>, AppError> {
    let pack = hysj_db::emojis::create_pack(
        &state.db,
        &req.name,
        req.description.as_deref(),
        Some(auth.user_id),
        req.is_premium,
        req.price_cents,
    )
    .await?;

    Ok(Json(EmojiPackDto {
        id: pack.id,
        name: pack.name,
        description: pack.description,
        cover_image_url: pack.cover_image_url,
        is_premium: pack.is_premium,
        price_cents: pack.price_cents,
        emoji_count: 0,
    }))
}

/// GET /api/emojis/packs — list all packs
pub async fn list_packs(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<EmojiPackDto>>, AppError> {
    let packs = hysj_db::emojis::list_packs(&state.db).await?;

    let mut dtos = Vec::with_capacity(packs.len());
    for pack in packs {
        let emojis = hysj_db::emojis::get_pack_emojis(&state.db, pack.id).await?;
        dtos.push(EmojiPackDto {
            id: pack.id,
            name: pack.name,
            description: pack.description,
            cover_image_url: pack.cover_image_url,
            is_premium: pack.is_premium,
            price_cents: pack.price_cents,
            emoji_count: emojis.len() as i64,
        });
    }

    Ok(Json(dtos))
}

/// GET /api/emojis/packs/:pack_id — get pack with all emojis
pub async fn get_pack(
    State(state): State<Arc<AppState>>,
    Path(pack_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let pack = hysj_db::emojis::get_pack(&state.db, pack_id)
        .await?
        .ok_or(AppError(HysjError::ValidationError(
            "Pack not found".into(),
        )))?;

    let emojis = hysj_db::emojis::get_pack_emojis(&state.db, pack_id).await?;

    let emoji_dtos: Vec<EmojiDto> = emojis
        .into_iter()
        .map(|e| EmojiDto {
            id: e.id,
            shortcode: e.shortcode,
            image_url: e.image_url,
            is_animated: e.is_animated,
        })
        .collect();

    Ok(Json(serde_json::json!({
        "pack": {
            "id": pack.id,
            "name": pack.name,
            "description": pack.description,
            "cover_image_url": pack.cover_image_url,
            "is_premium": pack.is_premium,
            "price_cents": pack.price_cents,
            "emoji_count": emoji_dtos.len(),
        },
        "emojis": emoji_dtos,
    })))
}

/// POST /api/emojis/packs/:pack_id/purchase — purchase/activate pack
pub async fn purchase_pack(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(pack_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Verify pack exists
    let _pack = hysj_db::emojis::get_pack(&state.db, pack_id)
        .await?
        .ok_or(AppError(HysjError::ValidationError(
            "Pack not found".into(),
        )))?;

    hysj_db::emojis::purchase_pack(&state.db, auth.user_id, pack_id).await?;

    Ok(Json(serde_json::json!({ "purchased": true })))
}

/// GET /api/emojis/mine — list user's purchased packs
pub async fn my_packs(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<Vec<EmojiPackDto>>, AppError> {
    let packs = hysj_db::emojis::get_user_packs(&state.db, auth.user_id).await?;

    let mut dtos = Vec::with_capacity(packs.len());
    for pack in packs {
        let emojis = hysj_db::emojis::get_pack_emojis(&state.db, pack.id).await?;
        dtos.push(EmojiPackDto {
            id: pack.id,
            name: pack.name,
            description: pack.description,
            cover_image_url: pack.cover_image_url,
            is_premium: pack.is_premium,
            price_cents: pack.price_cents,
            emoji_count: emojis.len() as i64,
        });
    }

    Ok(Json(dtos))
}

/// POST /api/emojis/packs/:pack_id/emojis — add emoji to pack (creator only)
pub async fn add_emoji(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(pack_id): Path<Uuid>,
    Json(req): Json<AddEmojiRequest>,
) -> Result<Json<EmojiDto>, AppError> {
    // Verify pack exists and user is the creator
    let pack = hysj_db::emojis::get_pack(&state.db, pack_id)
        .await?
        .ok_or(AppError(HysjError::ValidationError(
            "Pack not found".into(),
        )))?;

    if pack.creator_id != Some(auth.user_id) {
        return Err(AppError(HysjError::AuthFailed(
            "Only the pack creator can add emojis".into(),
        )));
    }

    let emoji = hysj_db::emojis::add_emoji(
        &state.db,
        pack_id,
        &req.shortcode,
        &req.image_url,
        req.is_animated,
    )
    .await?;

    Ok(Json(EmojiDto {
        id: emoji.id,
        shortcode: emoji.shortcode,
        image_url: emoji.image_url,
        is_animated: emoji.is_animated,
    }))
}
