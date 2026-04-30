use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Algorithm, Argon2, Params, Version,
};

use crate::AuthError;

/// Hash a password with Argon2id using recommended parameters.
/// Returns the PHC-formatted hash string and the raw salt bytes.
pub fn hash_password(password: &str) -> Result<(String, Vec<u8>), AuthError> {
    let salt = SaltString::generate(&mut OsRng);

    let params = Params::new(65536, 3, 4, None)
        .map_err(|e| AuthError::HashingFailed(e.to_string()))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AuthError::HashingFailed(e.to_string()))?;

    let hash_string = hash.to_string();

    // Extract raw salt bytes from the SaltString
    let salt_bytes = salt.as_str().as_bytes().to_vec();

    Ok((hash_string, salt_bytes))
}

/// Verify a password against an Argon2id PHC-formatted hash string.
pub fn verify_password(password: &str, hash: &str) -> Result<bool, AuthError> {
    let parsed_hash =
        PasswordHash::new(hash).map_err(|e| AuthError::HashingFailed(e.to_string()))?;

    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(AuthError::HashingFailed(e.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let password = "super_secure_password_123!";
        let (hash, salt) = hash_password(password).unwrap();

        assert!(!hash.is_empty());
        assert!(!salt.is_empty());
        assert!(hash.contains("argon2id"));

        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_different_passwords_different_hashes() {
        let (hash1, _) = hash_password("password1").unwrap();
        let (hash2, _) = hash_password("password2").unwrap();
        assert_ne!(hash1, hash2);
    }
}
