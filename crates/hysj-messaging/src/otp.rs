use redis::AsyncCommands;

use crate::MessagingError;

/// Store an OTP code in Redis with TTL.
///
/// Redis key: `otp:{phone_number}`
pub async fn store_otp(
    conn: &mut impl AsyncCommands,
    phone_number: &str,
    code: &str,
    ttl_seconds: u64,
) -> Result<(), MessagingError> {
    let key = format!("otp:{}", phone_number);

    conn.set_ex::<_, _, ()>(&key, code, ttl_seconds).await?;

    tracing::debug!(phone = %phone_number, "OTP stored in Redis");
    Ok(())
}

/// Verify an OTP code. Returns true if valid, and deletes the OTP on success.
pub async fn verify_otp(
    conn: &mut impl AsyncCommands,
    phone_number: &str,
    code: &str,
) -> Result<bool, MessagingError> {
    let key = format!("otp:{}", phone_number);

    let stored: Option<String> = conn.get(&key).await?;

    match stored {
        Some(stored_code) if stored_code == code => {
            // Delete OTP after successful verification (one-time use)
            let _: () = conn.del(&key).await?;
            tracing::debug!(phone = %phone_number, "OTP verified successfully");
            Ok(true)
        }
        Some(_) => {
            tracing::debug!(phone = %phone_number, "OTP verification failed: wrong code");
            Ok(false)
        }
        None => {
            tracing::debug!(phone = %phone_number, "OTP verification failed: expired or not found");
            Ok(false)
        }
    }
}

/// Store a verification token (proof of phone ownership) in Redis.
///
/// Redis key: `otp_verified:{token}`
pub async fn store_verification_token(
    conn: &mut impl AsyncCommands,
    token: &str,
    phone_number: &str,
    ttl_seconds: u64,
) -> Result<(), MessagingError> {
    let key = format!("otp_verified:{}", token);

    conn.set_ex::<_, _, ()>(&key, phone_number, ttl_seconds).await?;

    Ok(())
}

/// Validate a verification token. Returns the phone number if valid, and deletes the token.
pub async fn validate_verification_token(
    conn: &mut impl AsyncCommands,
    token: &str,
) -> Result<Option<String>, MessagingError> {
    let key = format!("otp_verified:{}", token);

    let phone: Option<String> = conn.get(&key).await?;

    if phone.is_some() {
        let _: () = conn.del(&key).await?;
    }

    Ok(phone)
}

/// Generate a random numeric OTP code.
pub fn generate_otp(length: usize) -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| rng.gen_range(0..10).to_string())
        .collect()
}
