use std::sync::Arc;
use std::time::Duration;

use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use uuid::Uuid;

use hysj_shared::constants::{
    OTP_CODE_LENGTH, OTP_EXPIRY_SECONDS, OTP_VERIFICATION_TOKEN_EXPIRY_SECONDS,
};
use hysj_shared::dto::auth::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::state::AppState;

/// Extract client IP from headers.
fn extract_ip(headers: &HeaderMap) -> String {
    if let Some(cf) = headers
        .get("cf-connecting-ip")
        .and_then(|v| v.to_str().ok())
    {
        return cf.to_string();
    }
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first) = xff.split(',').next() {
            return first.trim().to_string();
        }
    }
    "unknown".to_string()
}

/// POST /api/auth/otp/send
///
/// Generate and send an OTP code via SMS.
/// In production, this calls Twilio. In dev, the code is logged.
pub async fn send_otp(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<SendOtpRequest>,
) -> Result<Json<SendOtpResponse>, AppError> {
    let ip = extract_ip(&headers);

    // Rate limit: max 3 OTP requests per phone per hour
    if !state.rate_limiter.check_rate_limit(
        &format!("otp:{}", req.phone_number),
        3,
        Duration::from_secs(3600),
    ) {
        return Err(AppError(HysjError::RateLimited));
    }

    // Rate limit by IP too
    if !state.rate_limiter.check_rate_limit(
        &format!("otp_ip:{}", ip),
        10,
        Duration::from_secs(3600),
    ) {
        return Err(AppError(HysjError::RateLimited));
    }

    // Validate phone number (basic: must start with + and be 8-15 digits)
    let digits: String = req.phone_number.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() < 8 || digits.len() > 15 || !req.phone_number.starts_with('+') {
        return Err(AppError(HysjError::ValidationError(
            "Invalid phone number format. Use international format: +47XXXXXXXX".into(),
        )));
    }

    // Generate OTP
    let code = hysj_messaging::otp::generate_otp(OTP_CODE_LENGTH);

    // Store in Redis
    let mut redis = state.redis.clone();
    hysj_messaging::otp::store_otp(&mut redis, &req.phone_number, &code, OTP_EXPIRY_SECONDS)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    // Send SMS via Twilio (or log in dev mode)
    if let Some(ref twilio) = state.config.twilio {
        send_sms_twilio(twilio, &req.phone_number, &code).await?;
    } else {
        // Dev mode: log the code
        tracing::warn!(
            phone = %req.phone_number,
            code = %code,
            "DEV MODE: OTP code (no Twilio configured)"
        );
    }

    Ok(Json(SendOtpResponse {
        message: "Verification code sent".into(),
        expires_in: OTP_EXPIRY_SECONDS,
    }))
}

/// POST /api/auth/otp/verify
///
/// Verify an OTP code. Returns a short-lived verification token on success.
pub async fn verify_otp(
    State(state): State<Arc<AppState>>,
    Json(req): Json<VerifyOtpRequest>,
) -> Result<Json<VerifyOtpResponse>, AppError> {
    if req.code.len() != OTP_CODE_LENGTH {
        return Err(AppError(HysjError::ValidationError(format!(
            "Code must be {} digits",
            OTP_CODE_LENGTH
        ))));
    }

    let mut redis = state.redis.clone();
    let valid = hysj_messaging::otp::verify_otp(&mut redis, &req.phone_number, &req.code)
        .await
        .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    if !valid {
        return Ok(Json(VerifyOtpResponse {
            verified: false,
            verification_token: None,
        }));
    }

    // Generate a verification token (proof of phone ownership)
    let token = Uuid::new_v4().to_string();
    hysj_messaging::otp::store_verification_token(
        &mut redis,
        &token,
        &req.phone_number,
        OTP_VERIFICATION_TOKEN_EXPIRY_SECONDS,
    )
    .await
    .map_err(|e| AppError(HysjError::InternalError(e.to_string())))?;

    Ok(Json(VerifyOtpResponse {
        verified: true,
        verification_token: Some(token),
    }))
}

/// Send SMS via Twilio REST API
async fn send_sms_twilio(
    config: &crate::config::TwilioConfig,
    to: &str,
    code: &str,
) -> Result<(), AppError> {
    let url = format!(
        "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
        config.account_sid
    );

    let body = format!(
        "Hysj verification code: {}. This code expires in 5 minutes.",
        code
    );

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .basic_auth(&config.account_sid, Some(&config.auth_token))
        .form(&[("To", to), ("From", &config.from_number), ("Body", &body)])
        .send()
        .await
        .map_err(|e| AppError(HysjError::InternalError(format!("Twilio request failed: {}", e))))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        tracing::error!(status = %status, body = %text, "Twilio SMS failed");
        return Err(AppError(HysjError::InternalError(
            "Failed to send SMS".into(),
        )));
    }

    tracing::info!(to = %to, "OTP SMS sent via Twilio");
    Ok(())
}
