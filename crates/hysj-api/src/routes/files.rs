use std::sync::Arc;
use std::time::Duration;

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use hysj_shared::constants::{AUDIO_SEEN_TTL_SECONDS, MAX_FILE_SIZE, MESSAGE_TTL_SECONDS};
use hysj_shared::dto::files::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// POST /api/files/upload-init
///
/// Initialize a file upload. Stores metadata in Redis, returns file_id + upload URL.
pub async fn upload_init(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<FileUploadInitRequest>,
) -> Result<Json<FileUploadInitResponse>, AppError> {
    if !state.rate_limiter.check_rate_limit(
        &format!("file:{}", auth.user_id),
        hysj_shared::constants::rate_limits::FILE_UPLOAD_MAX,
        Duration::from_secs(hysj_shared::constants::rate_limits::FILE_UPLOAD_WINDOW_SECONDS),
    ) {
        return Err(AppError(HysjError::RateLimited));
    }

    if req.file_size > MAX_FILE_SIZE {
        return Err(AppError(HysjError::ValidationError(format!(
            "File too large: {} bytes (max {} bytes)",
            req.file_size, MAX_FILE_SIZE
        ))));
    }

    if req.file_name.is_empty() {
        return Err(AppError(HysjError::ValidationError(
            "File name cannot be empty".into(),
        )));
    }

    let file_id = Uuid::new_v4().to_string();
    let upload_url = format!("/api/files/{}/upload", file_id);

    // Store file metadata in Redis
    let mut redis = state.redis.clone();
    hysj_messaging::media_store::store_meta(
        &mut redis,
        &file_id,
        req.recipient_device_id,
        0, // no duration for generic files
        req.file_size,
        MESSAGE_TTL_SECONDS,
    )
    .await
    .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    tracing::info!(
        file_id = %file_id,
        file_name = %req.file_name,
        file_size = req.file_size,
        chunks = req.chunk_count,
        "File upload initialized"
    );

    Ok(Json(FileUploadInitResponse { file_id, upload_url }))
}

/// PUT /api/files/:file_id/upload
///
/// Upload the encrypted file blob (raw bytes).
pub async fn upload_blob(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(file_id): Path<String>,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    let mut redis = state.redis.clone();

    // Verify upload was initialized
    let meta = hysj_messaging::media_store::get_meta(&mut redis, &file_id)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    let meta = meta.ok_or_else(|| {
        AppError(HysjError::ValidationError(
            "File upload not initialized or expired".into(),
        ))
    })?;

    if body.len() as u64 > meta.blob_size + 1024 {
        return Err(AppError(HysjError::ValidationError(format!(
            "Upload size {} exceeds declared size {}",
            body.len(),
            meta.blob_size
        ))));
    }

    if body.len() as u64 > MAX_FILE_SIZE {
        return Err(AppError(HysjError::ValidationError(
            "File exceeds maximum size".into(),
        )));
    }

    hysj_messaging::media_store::store_blob(
        &mut redis,
        &file_id,
        &body,
        MESSAGE_TTL_SECONDS,
    )
    .await
    .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    tracing::info!(file_id = %file_id, size = body.len(), "File blob uploaded");

    Ok(StatusCode::NO_CONTENT)
}

/// GET /api/files/:file_id
///
/// Download an encrypted file. Sets 3-min TTL after first download.
pub async fn download_blob(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(file_id): Path<String>,
) -> Result<(StatusCode, Bytes), AppError> {
    let mut redis = state.redis.clone();

    let blob = hysj_messaging::media_store::retrieve_and_expire(
        &mut redis,
        &file_id,
        AUDIO_SEEN_TTL_SECONDS,
    )
    .await
    .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    match blob {
        Some(data) => {
            tracing::info!(file_id = %file_id, size = data.len(), "File downloaded");
            Ok((StatusCode::OK, Bytes::from(data)))
        }
        None => Err(AppError(HysjError::NotFound(
            "File not found or expired".into(),
        ))),
    }
}

/// GET /api/files/:file_id/meta
///
/// Get file metadata without downloading.
pub async fn file_meta(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(file_id): Path<String>,
) -> Result<Json<FileMetaResponse>, AppError> {
    let mut redis = state.redis.clone();

    let meta = hysj_messaging::media_store::get_meta(&mut redis, &file_id)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    match meta {
        Some(m) => Ok(Json(FileMetaResponse {
            file_id,
            file_name: String::new(), // name is in encrypted envelope
            file_size: m.blob_size,
            chunk_count: 1,
            uploaded_at: chrono::Utc::now(),
        })),
        None => Err(AppError(HysjError::NotFound(
            "File metadata not found".into(),
        ))),
    }
}

/// DELETE /api/files/:file_id
///
/// Delete a file blob.
pub async fn delete_file(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(file_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let mut redis = state.redis.clone();

    let deleted = hysj_messaging::media_store::delete_blob(&mut redis, &file_id)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError(HysjError::NotFound("File not found".into())))
    }
}
