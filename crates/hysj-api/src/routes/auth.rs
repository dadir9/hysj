use std::sync::Arc;
use std::time::Duration;

use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use uuid::Uuid;

use hysj_shared::dto::auth::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// Extract client IP from headers (proxy-aware) or connection info.
fn extract_ip(headers: &HeaderMap) -> String {
    // Check proxy headers in priority order
    if let Some(cf) = headers.get("cf-connecting-ip").and_then(|v| v.to_str().ok()) {
        return cf.to_string();
    }
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first) = xff.split(',').next() {
            return first.trim().to_string();
        }
    }
    if let Some(real) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        return real.to_string();
    }
    "unknown".to_string()
}

/// POST /api/auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    let ip = extract_ip(&headers);
    if !state.rate_limiter.check_rate_limit(
        &format!("register:{}", ip),
        hysj_shared::constants::rate_limits::REGISTER_MAX,
        Duration::from_secs(hysj_shared::constants::rate_limits::REGISTER_WINDOW_SECONDS),
    ) {
        return Err(AppError(HysjError::RateLimited));
    }

    // Username is optional; if provided, validate length
    let username = req.username.unwrap_or_default();
    if !username.is_empty() && (username.len() < 3 || username.len() > 32) {
        return Err(AppError(HysjError::ValidationError(
            "Username must be 3-32 characters".into(),
        )));
    }
    // Validate device name length
    if req.device_name.is_empty() || req.device_name.len() > 64 {
        return Err(AppError(HysjError::ValidationError(
            "Device name must be 1-64 characters".into(),
        )));
    }

    if req.password.len() < 8 {
        return Err(AppError(HysjError::ValidationError(
            "Password must be at least 8 characters".into(),
        )));
    }

    let (password_hash, salt) = hysj_auth::password::hash_password(&req.password)
        .map_err(|e| AppError(HysjError::AuthFailed(e.to_string())))?;

    let identity_pk = B64
        .decode(&req.identity_public_key)
        .map_err(|e| {
            AppError(HysjError::ValidationError(format!(
                "Invalid identity_public_key base64: {}",
                e
            )))
        })?;

    let identity_dh_pk = identity_pk.clone();

    let user = hysj_db::users::create_user(
        &state.db,
        &username,
        &req.phone_number,
        &password_hash,
        &salt,
        &identity_pk,
        &identity_dh_pk,
    )
    .await?;

    let signed_pre_key = B64.decode(&req.signed_pre_key).map_err(|e| {
        AppError(HysjError::ValidationError(format!("Invalid signed_pre_key: {}", e)))
    })?;
    let signed_pre_key_sig = B64.decode(&req.signed_pre_key_signature).map_err(|e| {
        AppError(HysjError::ValidationError(format!("Invalid signature: {}", e)))
    })?;
    let kyber_pk = B64.decode(&req.kyber_public_key).map_err(|e| {
        AppError(HysjError::ValidationError(format!("Invalid kyber key: {}", e)))
    })?;

    let device = hysj_db::devices::register_device(
        &state.db,
        user.id,
        &req.device_name,
        &signed_pre_key,
        &signed_pre_key_sig,
        &kyber_pk,
    )
    .await?;

    let pre_key_bytes: Result<Vec<Vec<u8>>, _> = req
        .one_time_pre_keys
        .iter()
        .map(|k| B64.decode(k))
        .collect();
    let pre_key_bytes = pre_key_bytes.map_err(|e| {
        AppError(HysjError::ValidationError(format!("Invalid pre-key: {}", e)))
    })?;

    hysj_db::keys::store_pre_keys(&state.db, device.id, &pre_key_bytes).await?;

    let access_token = hysj_auth::jwt::create_access_token(
        user.id, device.id, &user.username, &state.config.jwt_secret,
    )?;

    let refresh_token = hysj_auth::jwt::create_refresh_token(
        user.id, device.id, &user.username, &state.config.jwt_secret,
    )?;

    tracing::info!(user_id = %user.id, username = %user.username, "User registered");

    Ok(Json(LoginResponse {
        access_token,
        refresh_token,
        user_id: user.id,
        device_id: device.id,
        requires_2fa: false,
    }))
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    let ip = extract_ip(&headers);
    let ip = ip.as_str();

    // In-memory rate limit check
    if !state.rate_limiter.check_rate_limit(
        &format!("login:{}", ip),
        hysj_shared::constants::rate_limits::LOGIN_MAX,
        Duration::from_secs(hysj_shared::constants::rate_limits::LOGIN_WINDOW_SECONDS),
    ) {
        return Err(AppError(HysjError::RateLimited));
    }
    let locked = hysj_db::login_attempts::is_locked_out(
        &state.db,
        ip,
        hysj_shared::constants::rate_limits::LOGIN_MAX,
        hysj_shared::constants::rate_limits::LOGIN_LOCKOUT_SECONDS,
    )
    .await?;

    if locked {
        return Err(AppError(HysjError::RateLimited));
    }

    let user = hysj_db::users::find_by_phone_number(&state.db, &req.phone_number)
        .await?
        .ok_or(AppError(HysjError::InvalidCredentials))?;

    let valid = hysj_auth::password::verify_password(&req.password, &user.password_hash)
        .map_err(|e| AppError(HysjError::AuthFailed(e.to_string())))?;

    if !valid {
        hysj_db::login_attempts::record_attempt(&state.db, ip, Some(user.id), false).await?;
        return Err(AppError(HysjError::InvalidCredentials));
    }

    hysj_db::login_attempts::record_attempt(&state.db, ip, Some(user.id), true).await?;

    if user.has_2fa_enabled {
        return Ok(Json(LoginResponse {
            access_token: String::new(),
            refresh_token: String::new(),
            user_id: user.id,
            device_id: Uuid::nil(),
            requires_2fa: true,
        }));
    }

    let device = if let Some(device_id) = req.device_id {
        hysj_db::devices::find_by_id(&state.db, device_id)
            .await
            .map_err(|_| AppError(HysjError::DeviceNotFound(device_id)))?
    } else {
        hysj_db::devices::find_one_device_for_user(&state.db, user.id)
            .await
            .map_err(|_| AppError(HysjError::AuthFailed("No device registered".into())))?
    };

    let access_token = hysj_auth::jwt::create_access_token(
        user.id, device.id, &user.username, &state.config.jwt_secret,
    )?;

    let refresh_token = hysj_auth::jwt::create_refresh_token(
        user.id, device.id, &user.username, &state.config.jwt_secret,
    )?;

    hysj_db::users::update_last_seen(&state.db, user.id).await?;

    tracing::info!(user_id = %user.id, "User logged in");

    Ok(Json(LoginResponse {
        access_token,
        refresh_token,
        user_id: user.id,
        device_id: device.id,
        requires_2fa: false,
    }))
}

/// POST /api/auth/refresh
pub async fn refresh(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    let claims = hysj_auth::jwt::validate_token(&req.refresh_token, &state.config.jwt_secret)?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError(HysjError::InvalidToken))?;
    let device_id = Uuid::parse_str(&claims.device_id).map_err(|_| AppError(HysjError::InvalidToken))?;

    let access_token = hysj_auth::jwt::create_access_token(
        user_id, device_id, &claims.username, &state.config.jwt_secret,
    )?;

    let refresh_token = hysj_auth::jwt::create_refresh_token(
        user_id, device_id, &claims.username, &state.config.jwt_secret,
    )?;

    Ok(Json(LoginResponse {
        access_token,
        refresh_token,
        user_id,
        device_id,
        requires_2fa: false,
    }))
}

/// POST /api/auth/2fa/setup
pub async fn setup_2fa(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<TwoFactorSetupResponse>, AppError> {
    let secret = hysj_auth::totp::generate_secret();
    let qr_uri = hysj_auth::totp::generate_totp_uri(&secret, &auth.username);

    hysj_db::users::enable_2fa(&state.db, auth.user_id, secret.as_bytes()).await?;

    Ok(Json(TwoFactorSetupResponse { secret, qr_uri }))
}

/// POST /api/auth/2fa/verify
pub async fn verify_2fa(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<TwoFactorVerifyRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = hysj_db::users::find_by_id(&state.db, auth.user_id)
        .await?
        .ok_or(AppError(HysjError::UserNotFound(auth.user_id)))?;

    let totp_secret = user
        .totp_secret
        .ok_or_else(|| AppError(HysjError::ValidationError("2FA not set up".into())))?;

    let secret_str = String::from_utf8(totp_secret).map_err(|_| AppError(HysjError::Internal))?;

    let valid = hysj_auth::totp::verify_totp(&secret_str, &req.code)
        .map_err(|e| AppError(HysjError::AuthFailed(e.to_string())))?;

    if !valid {
        return Err(AppError(HysjError::InvalidTwoFactorCode));
    }

    // 2FA already enabled during setup; this verifies it works
    tracing::info!(user_id = %auth.user_id, "2FA verified");

    Ok(Json(serde_json::json!({ "status": "2fa_enabled" })))
}

/// POST /api/auth/set-username
pub async fn set_username(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<SetUsernameRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if req.username.len() < 3 || req.username.len() > 32 {
        return Err(AppError(HysjError::ValidationError(
            "Username must be 3-32 characters".into(),
        )));
    }

    hysj_db::users::set_username(&state.db, auth.user_id, &req.username).await?;

    tracing::info!(user_id = %auth.user_id, username = %req.username, "Username set");

    Ok(Json(serde_json::json!({ "status": "username_set", "username": req.username })))
}

/// GET /api/auth/username-available/:username
pub async fn username_available(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(username): axum::extract::Path<String>,
) -> Result<Json<UsernameAvailableResponse>, AppError> {
    let available = hysj_db::users::is_username_available(&state.db, &username).await?;

    Ok(Json(UsernameAvailableResponse {
        username,
        available,
    }))
}

/// POST /api/auth/set-display-name
pub async fn set_display_name(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<SetDisplayNameRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if req.display_name.is_empty() || req.display_name.len() > 64 {
        return Err(AppError(HysjError::ValidationError(
            "Display name must be 1-64 characters".into(),
        )));
    }

    hysj_db::users::set_display_name(&state.db, auth.user_id, &req.display_name).await?;

    tracing::info!(user_id = %auth.user_id, "Display name set");

    Ok(Json(serde_json::json!({ "status": "display_name_set" })))
}

/// DELETE /api/auth/account — permanently delete user account
pub async fn delete_account(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    hysj_db::users::delete_user(&state.db, auth.user_id).await?;

    tracing::info!(user_id = %auth.user_id, "User account deleted");

    Ok(Json(serde_json::json!({ "status": "account_deleted" })))
}

/// POST /api/auth/set-avatar — set or clear avatar URL
pub async fn set_avatar(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<SetAvatarRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if let Some(ref url) = req.avatar_url {
        if url.len() > 2048 {
            return Err(AppError(HysjError::ValidationError(
                "Avatar URL must be at most 2048 characters".into(),
            )));
        }
    }

    hysj_db::users::set_avatar(&state.db, auth.user_id, req.avatar_url.as_deref()).await?;

    tracing::info!(user_id = %auth.user_id, "Avatar updated");

    Ok(Json(serde_json::json!({ "status": "avatar_set" })))
}

/// PUT /api/users/status — set user presence status
pub async fn set_user_status(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<SetStatusRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let valid_statuses = ["online", "away", "dnd", "offline"];
    if !valid_statuses.contains(&req.status.as_str()) {
        return Err(AppError(HysjError::ValidationError(
            "Status must be one of: online, away, dnd, offline".into(),
        )));
    }

    hysj_db::users::set_status(&state.db, auth.user_id, &req.status).await?;

    tracing::info!(user_id = %auth.user_id, status = %req.status, "User status updated");

    Ok(Json(serde_json::json!({ "status": req.status })))
}

/// POST /api/auth/sender-certificate
pub async fn sender_certificate(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<SenderCertificateResponse>, AppError> {
    let user = hysj_db::users::find_by_id(&state.db, auth.user_id)
        .await?
        .ok_or(AppError(HysjError::UserNotFound(auth.user_id)))?;

    let (signing_key, verifying_key) =
        hysj_auth::certificate::get_signing_keypair_from_seed(&state.config.cert_signing_seed);

    let cert = hysj_auth::certificate::sign_certificate(
        auth.user_id, &auth.username, &user.identity_public_key, &signing_key,
    );

    let cert_json = serde_json::to_string(&cert).map_err(|_| AppError(HysjError::Internal))?;

    let server_pk = B64.encode(verifying_key.as_bytes());

    Ok(Json(SenderCertificateResponse {
        certificate: B64.encode(cert_json.as_bytes()),
        server_public_key: server_pk,
    }))
}
