use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use rand::rngs::OsRng;
use rand::RngCore;

use crate::CryptoError;

/// Encrypt plaintext with XChaCha20-Poly1305.
///
/// Returns: nonce (24 bytes) || ciphertext+tag.
/// The `aad` parameter provides additional authenticated data.
pub fn encrypt(plaintext: &[u8], key: &[u8; 32], aad: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = XChaCha20Poly1305::new(key.into());

    let mut nonce_bytes = [0u8; 24];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let payload = chacha20poly1305::aead::Payload {
        msg: plaintext,
        aad,
    };

    let ciphertext = cipher
        .encrypt(nonce, payload)
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    // nonce (24) || ciphertext || tag (16, appended by aead)
    let mut result = Vec::with_capacity(24 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

/// Decrypt ciphertext produced by `encrypt`.
///
/// Input format: nonce (24 bytes) || ciphertext+tag.
/// The `aad` must match what was provided during encryption.
pub fn decrypt(
    ciphertext_with_nonce: &[u8],
    key: &[u8; 32],
    aad: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    if ciphertext_with_nonce.len() < 24 + 16 {
        return Err(CryptoError::DecryptionFailed(
            "ciphertext too short".to_string(),
        ));
    }

    let (nonce_bytes, ciphertext) = ciphertext_with_nonce.split_at(24);
    let nonce = XNonce::from_slice(nonce_bytes);

    let cipher = XChaCha20Poly1305::new(key.into());

    let payload = chacha20poly1305::aead::Payload {
        msg: ciphertext,
        aad,
    };

    cipher
        .decrypt(nonce, payload)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = [0x42u8; 32];
        let plaintext = b"Hello, Hysj!";
        let aad = b"associated-data";

        let encrypted = encrypt(plaintext, &key, aad).unwrap();
        assert!(encrypted.len() > 24 + 16);

        let decrypted = decrypt(&encrypted, &key, aad).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_decrypt_wrong_key_fails() {
        let key = [0x42u8; 32];
        let wrong_key = [0x43u8; 32];
        let plaintext = b"secret message";
        let aad = b"";

        let encrypted = encrypt(plaintext, &key, aad).unwrap();
        let result = decrypt(&encrypted, &wrong_key, aad);
        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_wrong_aad_fails() {
        let key = [0x42u8; 32];
        let plaintext = b"secret message";

        let encrypted = encrypt(plaintext, &key, b"correct-aad").unwrap();
        let result = decrypt(&encrypted, &key, b"wrong-aad");
        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_too_short() {
        let key = [0x42u8; 32];
        let result = decrypt(&[0u8; 30], &key, b"");
        assert!(result.is_err());
    }
}
