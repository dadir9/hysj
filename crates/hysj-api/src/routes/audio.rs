use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use hysj_shared::constants::{
    AUDIO_SEEN_TTL_SECONDS, AUDIO_TTL_SECONDS, MAX_AUDIO_DURATION_SECONDS, MAX_AUDIO_SIZE,
};
use hysj_shared::dto::audio::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// POST /api/audio/upload-init
///
/// Initialize an audio upload. Returns an audio_id and upload URL.
/// The client then PUTs the encrypted audio bytes to the upload URL.
pub async fn upload_init(
    State(_state): State<Arc<AppState>>,
    _auth: AuthUser,
    Json(req): Json<AudioUploadRequest>,
) -> Result<Json<AudioUploadResponse>, AppError> {
    // Validate duration
    if req.duration_seconds == 0 || req.duration_seconds > MAX_AUDIO_DURATION_SECONDS {
        return Err(AppError(HysjError::ValidationError(format!(
            "Audio duration must be 1–{} seconds, got {}",
            MAX_AUDIO_DURATION_SECONDS, req.duration_seconds
        ))));
    }

    // Validate size
    if req.blob_size == 0 || req.blob_size > MAX_AUDIO_SIZE {
        return Err(AppError(HysjError::ValidationError(format!(
            "Audio size must be 1–{} bytes, got {}",
            MAX_AUDIO_SIZE, req.blob_size
        ))));
    }

    let audio_id = Uuid::new_v4().to_string();
    let upload_url = format!("/api/audio/{}/upload", audio_id);

    // Store metadata in Redis so the upload endpoint can validate
    let mut redis = _state.redis.clone();
    hysj_messaging::media_store::store_meta(
        &mut redis,
        &audio_id,
        req.recipient_device_id,
        req.duration_seconds,
        req.blob_size,
        AUDIO_TTL_SECONDS,
    )
    .await
    .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    tracing::info!(
        audio_id = %audio_id,
        duration = req.duration_seconds,
        size = req.blob_size,
        "Audio upload initialized"
    );

    Ok(Json(AudioUploadResponse {
        audio_id,
        upload_url,
    }))
}

/// PUT /api/audio/:audio_id/upload
///
/// Upload the encrypted audio blob. The body is raw bytes (application/octet-stream).
/// Audio is stored in Redis with TTL — no disk, deleted after retrieval.
pub async fn upload_blob(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(audio_id): Path<String>,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    // Check metadata exists (upload was initialized)
    let mut redis = state.redis.clone();
    let meta = hysj_messaging::media_store::get_meta(&mut redis, &audio_id)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    let meta = meta.ok_or_else(|| {
        AppError(HysjError::ValidationError(
            "Audio upload not initialized or expired".into(),
        ))
    })?;

    // Validate blob size matches what was declared
    if body.len() as u64 > meta.blob_size + 1024 {
        return Err(AppError(HysjError::ValidationError(format!(
            "Upload size {} exceeds declared size {}",
            body.len(),
            meta.blob_size
        ))));
    }

    if body.len() as u64 > MAX_AUDIO_SIZE {
        return Err(AppError(HysjError::ValidationError(
            "Audio blob exceeds maximum size".into(),
        )));
    }

    // Store encrypted blob in Redis
    hysj_messaging::media_store::store_blob(
        &mut redis,
        &audio_id,
        &body,
        AUDIO_TTL_SECONDS,
    )
    .await
    .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    tracing::info!(
        audio_id = %audio_id,
        size = body.len(),
        "Audio blob uploaded"
    );

    Ok(StatusCode::NO_CONTENT)
}

/// GET /api/audio/:audio_id
///
/// Download the encrypted audio blob. Once downloaded (seen/played),
/// the blob auto-deletes after 3 minutes. Returns 404 if expired.
pub async fn download_blob(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(audio_id): Path<String>,
) -> Result<(StatusCode, Bytes), AppError> {
    let mut redis = state.redis.clone();

    let blob = hysj_messaging::media_store::retrieve_and_expire(
        &mut redis,
        &audio_id,
        AUDIO_SEEN_TTL_SECONDS,
    )
    .await
    .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    match blob {
        Some(data) => {
            tracing::info!(
                audio_id = %audio_id,
                size = data.len(),
                "Audio blob downloaded — auto-deletes in 3 min"
            );
            Ok((StatusCode::OK, Bytes::from(data)))
        }
        None => Err(AppError(HysjError::NotFound(
            "Audio not found or expired".into(),
        ))),
    }
}

/// GET /api/audio/:audio_id/meta
///
/// Get audio metadata (duration, size) without downloading the blob.
pub async fn audio_meta(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(audio_id): Path<String>,
) -> Result<Json<AudioMeta>, AppError> {
    let mut redis = state.redis.clone();

    let meta = hysj_messaging::media_store::get_meta(&mut redis, &audio_id)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    match meta {
        Some(m) => Ok(Json(AudioMeta {
            audio_id,
            duration_seconds: m.duration_seconds,
            blob_size: m.blob_size,
        })),
        None => Err(AppError(HysjError::NotFound(
            "Audio metadata not found".into(),
        ))),
    }
}

/// DELETE /api/audio/:audio_id
///
/// Delete an audio blob (sender cancel or wipe).
pub async fn delete_audio(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(audio_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let mut redis = state.redis.clone();

    let deleted = hysj_messaging::media_store::delete_blob(&mut redis, &audio_id)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    if deleted {
        tracing::info!(audio_id = %audio_id, "Audio blob deleted");
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError(HysjError::NotFound(
            "Audio not found".into(),
        )))
    }
}
