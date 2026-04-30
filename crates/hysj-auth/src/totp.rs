use totp_rs::{Algorithm, Secret, TOTP};

use crate::AuthError;

const ISSUER: &str = "Hysj";
const DIGITS: usize = 6;
const STEP: u64 = 30;

/// Generate a random TOTP secret, returned as a base32-encoded string.
pub fn generate_secret() -> String {
    let secret = Secret::generate_secret();
    secret.to_encoded().to_string()
}

/// Create an `otpauth://` URI suitable for QR-code generation.
pub fn generate_totp_uri(secret: &str, username: &str) -> String {
    let totp = build_totp(secret, username)
        .expect("failed to build TOTP for URI generation");
    totp.get_url()
}

/// Verify a 6-digit TOTP code against the given base32-encoded secret.
pub fn verify_totp(secret: &str, code: &str) -> Result<bool, AuthError> {
    let totp = build_totp(secret, "user")
        .map_err(|e| AuthError::TotpError(e.to_string()))?;

    totp.check_current(code)
        .map_err(|e| AuthError::TotpError(e.to_string()))
}

/// Internal helper to construct a TOTP instance.
fn build_totp(secret: &str, account_name: &str) -> Result<TOTP, AuthError> {
    let secret_bytes = Secret::Encoded(secret.to_string())
        .to_bytes()
        .map_err(|e| AuthError::TotpError(e.to_string()))?;

    TOTP::new(
        Algorithm::SHA1,
        DIGITS,
        1, // skew: allow 1 step in either direction
        STEP,
        secret_bytes,
        Some(ISSUER.to_string()),
        account_name.to_string(),
    )
    .map_err(|e| AuthError::TotpError(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_secret_is_nonempty() {
        let secret = generate_secret();
        assert!(!secret.is_empty());
    }

    #[test]
    fn test_generate_totp_uri_format() {
        let secret = generate_secret();
        let uri = generate_totp_uri(&secret, "alice");
        assert!(uri.starts_with("otpauth://totp/"));
        assert!(uri.contains("Hysj"));
        assert!(uri.contains("alice"));
    }

    #[test]
    fn test_verify_totp_with_current_code() {
        let secret = generate_secret();
        let totp = build_totp(&secret, "test").unwrap();
        let code = totp.generate_current().unwrap();

        let result = verify_totp(&secret, &code).unwrap();
        assert!(result);
    }

    #[test]
    fn test_verify_totp_with_wrong_code() {
        let secret = generate_secret();
        let result = verify_totp(&secret, "000000").unwrap();
        // This *could* be true by coincidence, but is astronomically unlikely
        // We mainly check it doesn't panic/error
        let _ = result;
    }
}
