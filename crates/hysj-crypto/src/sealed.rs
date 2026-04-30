use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey, StaticSecret};

use crate::cipher;
use crate::kdf::hkdf_derive;
use crate::keys;
use crate::CryptoError;

/// Content extracted from a sealed sender message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SealedContent {
    pub sender_id: String,
    pub sender_certificate: Vec<u8>,
    pub plaintext: Vec<u8>,
}

/// Inner payload that gets encrypted inside the sealed sender envelope.
#[derive(Serialize, Deserialize)]
struct SealedInner {
    sender_id: String,
    sender_cert: Vec<u8>,
    plaintext: Vec<u8>,
}

/// Seal a message so the server cannot identify the sender.
///
/// The output is: ephemeral_public (32 bytes) || encrypted_inner.
/// Only the recipient (who holds the identity private key) can open it
/// and discover the sender's identity.
pub fn seal(
    plaintext: &[u8],
    sender_id: &str,
    sender_cert: &[u8],
    recipient_identity_public: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    if recipient_identity_public.len() != 32 {
        return Err(CryptoError::InvalidKeyLength {
            expected: 32,
            actual: recipient_identity_public.len(),
        });
    }

    // 1. Generate ephemeral X25519 keypair
    let ephemeral = keys::generate_x25519_keypair();

    // 2. DH(ephemeral_secret, recipient_identity_public) -> shared_secret
    let mut pk_bytes = [0u8; 32];
    pk_bytes.copy_from_slice(recipient_identity_public);
    let recipient_public = PublicKey::from(pk_bytes);
    let dh_shared = ephemeral.secret.diffie_hellman(&recipient_public);

    // 3. Derive encryption key via HKDF
    let encryption_key = hkdf_derive(dh_shared.as_bytes(), b"", b"hysj-sealed-enc", 32);
    let mut enc_key = [0u8; 32];
    enc_key.copy_from_slice(&encryption_key);

    // 4. Serialize inner payload
    let inner = SealedInner {
        sender_id: sender_id.to_string(),
        sender_cert: sender_cert.to_vec(),
        plaintext: plaintext.to_vec(),
    };
    let inner_bytes = serde_json::to_vec(&inner)
        .map_err(|e| CryptoError::SerializationError(e.to_string()))?;

    // 5. Encrypt inner payload
    let encrypted_inner = cipher::encrypt(&inner_bytes, &enc_key, b"")?;

    // 6. Return: ephemeral_public (32 bytes) || encrypted_inner
    let mut result = Vec::with_capacity(32 + encrypted_inner.len());
    result.extend_from_slice(ephemeral.public.as_bytes());
    result.extend_from_slice(&encrypted_inner);

    Ok(result)
}

/// Open a sealed sender message.
///
/// Recovers the sender identity and plaintext. Optionally verifies the
/// sender certificate against a known verification key.
pub fn open(
    sealed_blob: &[u8],
    my_identity_secret: &[u8],
    cert_verification_key: &[u8],
) -> Result<SealedContent, CryptoError> {
    if sealed_blob.len() < 32 + 24 + 16 {
        return Err(CryptoError::SealedSenderError(
            "sealed blob too short".to_string(),
        ));
    }
    if my_identity_secret.len() != 32 {
        return Err(CryptoError::InvalidKeyLength {
            expected: 32,
            actual: my_identity_secret.len(),
        });
    }

    // 1. Extract ephemeral_public (first 32 bytes)
    let (ephemeral_bytes, encrypted_inner) = sealed_blob.split_at(32);
    let mut eph_arr = [0u8; 32];
    eph_arr.copy_from_slice(ephemeral_bytes);
    let ephemeral_public = PublicKey::from(eph_arr);

    // 2. DH(my_identity_secret, ephemeral_public) -> shared_secret
    let mut secret_arr = [0u8; 32];
    secret_arr.copy_from_slice(my_identity_secret);
    let my_secret = StaticSecret::from(secret_arr);
    let dh_shared = my_secret.diffie_hellman(&ephemeral_public);

    // 3. Derive encryption key
    let encryption_key = hkdf_derive(dh_shared.as_bytes(), b"", b"hysj-sealed-enc", 32);
    let mut enc_key = [0u8; 32];
    enc_key.copy_from_slice(&encryption_key);

    // 4. Decrypt inner payload
    let inner_bytes = cipher::decrypt(encrypted_inner, &enc_key, b"")?;

    // 5. Deserialize inner -> SealedContent
    let inner: SealedInner = serde_json::from_slice(&inner_bytes)
        .map_err(|e| CryptoError::DeserializationError(e.to_string()))?;

    // 6. Verify sender certificate if verification key is provided and non-empty
    if !cert_verification_key.is_empty() && cert_verification_key.len() == 32 {
        // The certificate is expected to be an Ed25519 signature over the sender_id
        if inner.sender_cert.len() == 64 {
            let vk_bytes: [u8; 32] = cert_verification_key.try_into().map_err(|_| {
                CryptoError::SealedSenderError("invalid verification key".to_string())
            })?;
            match ed25519_dalek::VerifyingKey::from_bytes(&vk_bytes) {
                Ok(vk) => {
                    if !keys::verify(&vk, inner.sender_id.as_bytes(), &inner.sender_cert) {
                        return Err(CryptoError::SealedSenderError(
                            "sender certificate verification failed".to_string(),
                        ));
                    }
                }
                Err(_) => {
                    return Err(CryptoError::SealedSenderError(
                        "invalid verification key format".to_string(),
                    ));
                }
            }
        }
    }

    Ok(SealedContent {
        sender_id: inner.sender_id,
        sender_certificate: inner.sender_cert,
        plaintext: inner.plaintext,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seal_open_roundtrip() {
        let recipient = keys::generate_x25519_keypair();
        let sender_ed = keys::generate_ed25519_keypair();

        let sender_id = "alice@hysj.no";
        let cert = keys::sign(&sender_ed, sender_id.as_bytes());
        let plaintext = b"secret message for Bob";

        let sealed = seal(
            plaintext,
            sender_id,
            &cert,
            recipient.public.as_bytes(),
        )
        .unwrap();

        let content = open(
            &sealed,
            recipient.secret.as_bytes(),
            sender_ed.verifying_key.as_bytes(),
        )
        .unwrap();

        assert_eq!(content.sender_id, sender_id);
        assert_eq!(content.plaintext, plaintext);
    }

    #[test]
    fn test_seal_wrong_recipient_fails() {
        let recipient = keys::generate_x25519_keypair();
        let wrong_recipient = keys::generate_x25519_keypair();

        let sealed = seal(b"secret", "alice", b"cert", recipient.public.as_bytes()).unwrap();

        let result = open(&sealed, wrong_recipient.secret.as_bytes(), b"");
        assert!(result.is_err());
    }

    #[test]
    fn test_seal_open_no_cert_verification() {
        let recipient = keys::generate_x25519_keypair();

        let sealed = seal(
            b"hello",
            "sender",
            b"no-cert",
            recipient.public.as_bytes(),
        )
        .unwrap();

        // Empty verification key skips cert check
        let content = open(&sealed, recipient.secret.as_bytes(), b"").unwrap();
        assert_eq!(content.plaintext, b"hello");
    }
}
