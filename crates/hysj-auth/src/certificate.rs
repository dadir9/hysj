use chrono::Utc;
use ed25519_dalek::{Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use hysj_shared::constants::SENDER_CERT_EXPIRY_SECONDS;

use crate::AuthError;

/// A sender certificate binds a user identity to their public key,
/// signed by the server's Ed25519 key. Used for sealed-sender messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SenderCertificate {
    pub user_id: String,
    pub username: String,
    pub public_key: Vec<u8>,
    pub expires_at: i64,
    pub signature: Vec<u8>,
}

/// Sign a new sender certificate valid for 24 hours.
///
/// `user_public_key` is the user's identity public key bytes.
/// `signing_key` is the server's Ed25519 signing key.
pub fn sign_certificate(
    user_id: Uuid,
    username: &str,
    user_public_key: &[u8],
    signing_key: &SigningKey,
) -> SenderCertificate {
    let expires_at = Utc::now().timestamp() + SENDER_CERT_EXPIRY_SECONDS as i64;

    let payload = certificate_payload(&user_id.to_string(), username, user_public_key, expires_at);
    let signature = signing_key.sign(&payload);

    SenderCertificate {
        user_id: user_id.to_string(),
        username: username.to_string(),
        public_key: user_public_key.to_vec(),
        expires_at,
        signature: signature.to_bytes().to_vec(),
    }
}

/// Verify a sender certificate's signature and check that it hasn't expired.
pub fn verify_certificate(
    cert: &SenderCertificate,
    verification_key: &VerifyingKey,
) -> Result<bool, AuthError> {
    // Check expiry first
    let now = Utc::now().timestamp();
    if cert.expires_at < now {
        return Err(AuthError::Expired);
    }

    let payload = certificate_payload(
        &cert.user_id,
        &cert.username,
        &cert.public_key,
        cert.expires_at,
    );

    let sig_bytes: [u8; 64] = cert
        .signature
        .as_slice()
        .try_into()
        .map_err(|_| AuthError::CertificateError("invalid signature length".to_string()))?;

    let signature = ed25519_dalek::Signature::from_bytes(&sig_bytes);

    match verification_key.verify(&payload, &signature) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Derive a deterministic Ed25519 keypair from a 32-byte seed.
pub fn get_signing_keypair_from_seed(
    seed: &[u8; 32],
) -> (SigningKey, VerifyingKey) {
    let signing_key = SigningKey::from_bytes(seed);
    let verifying_key = signing_key.verifying_key();
    (signing_key, verifying_key)
}

/// Build the canonical byte payload that gets signed / verified.
fn certificate_payload(
    user_id: &str,
    username: &str,
    public_key: &[u8],
    expires_at: i64,
) -> Vec<u8> {
    let mut buf = Vec::new();
    buf.extend_from_slice(user_id.as_bytes());
    buf.extend_from_slice(username.as_bytes());
    buf.extend_from_slice(public_key);
    buf.extend_from_slice(&expires_at.to_le_bytes());
    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_keypair() -> (SigningKey, VerifyingKey) {
        let seed = [42u8; 32];
        get_signing_keypair_from_seed(&seed)
    }

    #[test]
    fn test_sign_and_verify_certificate() {
        let (signing_key, verifying_key) = test_keypair();
        let user_id = Uuid::new_v4();
        let user_pk = [1u8; 32];

        let cert = sign_certificate(user_id, "alice", &user_pk, &signing_key);

        assert_eq!(cert.user_id, user_id.to_string());
        assert_eq!(cert.username, "alice");
        assert_eq!(cert.public_key, user_pk.to_vec());
        assert_eq!(cert.signature.len(), 64);

        let valid = verify_certificate(&cert, &verifying_key).unwrap();
        assert!(valid);
    }

    #[test]
    fn test_tampered_certificate_fails() {
        let (signing_key, verifying_key) = test_keypair();
        let user_id = Uuid::new_v4();

        let mut cert = sign_certificate(user_id, "alice", &[1u8; 32], &signing_key);
        cert.username = "mallory".to_string();

        let valid = verify_certificate(&cert, &verifying_key).unwrap();
        assert!(!valid);
    }

    #[test]
    fn test_deterministic_keypair() {
        let seed = [99u8; 32];
        let (k1, v1) = get_signing_keypair_from_seed(&seed);
        let (k2, v2) = get_signing_keypair_from_seed(&seed);

        assert_eq!(k1.to_bytes(), k2.to_bytes());
        assert_eq!(v1.to_bytes(), v2.to_bytes());
    }
}
