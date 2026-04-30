use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::CryptoError;

type HmacSha256 = Hmac<Sha256>;

/// Derive keying material using HKDF-SHA256.
pub fn hkdf_derive(ikm: &[u8], salt: &[u8], info: &[u8], output_len: usize) -> Vec<u8> {
    let hk = Hkdf::<Sha256>::new(Some(salt), ikm);
    let mut okm = vec![0u8; output_len];
    hk.expand(info, &mut okm)
        .expect("HKDF output length should be valid");
    okm
}

/// Compute HMAC-SHA256.
pub fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac =
        HmacSha256::new_from_slice(key).expect("HMAC can take key of any size");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

/// Derive a new root key and chain key from the current root key and DH output.
///
/// Uses HKDF with the root_key as salt and DH output as input keying material.
/// Returns (new_root_key [32 bytes], chain_key [32 bytes]).
pub fn derive_root_key(root_key: &[u8], dh_output: &[u8]) -> (Vec<u8>, Vec<u8>) {
    let hk = Hkdf::<Sha256>::new(Some(root_key), dh_output);
    let mut output = [0u8; 64];
    hk.expand(b"hysj-ratchet-root", &mut output)
        .expect("64-byte HKDF expand should succeed");
    let new_root_key = output[..32].to_vec();
    let chain_key = output[32..].to_vec();
    (new_root_key, chain_key)
}

/// Derive a new chain key and message key from the current chain key.
///
/// Uses HMAC-SHA256 with distinct constants for chain advancement and message key derivation.
/// Returns (new_chain_key [32 bytes], message_key [32 bytes]).
pub fn derive_chain_key(chain_key: &[u8]) -> (Vec<u8>, Vec<u8>) {
    let new_chain_key = hmac_sha256(chain_key, &[0x02]);
    let message_key = hmac_sha256(chain_key, &[0x01]);
    (new_chain_key, message_key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hkdf_derive() {
        let ikm = b"input keying material";
        let salt = b"salt";
        let info = b"info";
        let output = hkdf_derive(ikm, salt, info, 32);
        assert_eq!(output.len(), 32);

        // Deterministic: same input -> same output
        let output2 = hkdf_derive(ikm, salt, info, 32);
        assert_eq!(output, output2);
    }

    #[test]
    fn test_hmac_sha256() {
        let key = b"key";
        let data = b"data";
        let mac = hmac_sha256(key, data);
        assert_eq!(mac.len(), 32);

        // Deterministic
        let mac2 = hmac_sha256(key, data);
        assert_eq!(mac, mac2);
    }

    #[test]
    fn test_derive_root_key() {
        let root_key = [0x42u8; 32];
        let dh_output = [0x55u8; 32];
        let (new_root, chain) = derive_root_key(&root_key, &dh_output);
        assert_eq!(new_root.len(), 32);
        assert_eq!(chain.len(), 32);
        assert_ne!(new_root, chain);
    }

    #[test]
    fn test_derive_chain_key() {
        let chain_key = [0xAAu8; 32];
        let (new_chain, msg_key) = derive_chain_key(&chain_key);
        assert_eq!(new_chain.len(), 32);
        assert_eq!(msg_key.len(), 32);
        assert_ne!(new_chain, msg_key);
    }
}
