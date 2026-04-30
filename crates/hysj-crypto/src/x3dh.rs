use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey, StaticSecret};

use crate::kdf::hkdf_derive;
use crate::postquantum;
use crate::CryptoError;

/// Result of an X3DH initiation (sender side).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct X3DHInitResult {
    /// Combined shared secret (32 bytes).
    pub shared_secret: Vec<u8>,
    /// Sender's ephemeral X25519 public key.
    pub ephemeral_public: Vec<u8>,
    /// ML-KEM encapsulation ciphertext.
    pub kyber_ciphertext: Vec<u8>,
    /// Whether a one-time pre-key was used.
    pub used_one_time_key: bool,
}

/// Recipient's pre-key bundle published to the server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreKeyBundle {
    /// Recipient's identity X25519 public key (32 bytes).
    pub identity_public: Vec<u8>,
    /// Recipient's signed pre-key (32 bytes).
    pub signed_pre_key: Vec<u8>,
    /// Ed25519 signature over the signed pre-key.
    pub signed_pre_key_sig: Vec<u8>,
    /// Optional one-time pre-key (32 bytes).
    pub one_time_pre_key: Option<Vec<u8>>,
    /// ML-KEM-768 public key (1184 bytes).
    pub kyber_public: Vec<u8>,
}

/// Convert a 32-byte slice to an X25519 StaticSecret.
fn bytes_to_secret(bytes: &[u8]) -> Result<StaticSecret, CryptoError> {
    if bytes.len() != 32 {
        return Err(CryptoError::InvalidKeyLength {
            expected: 32,
            actual: bytes.len(),
        });
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(bytes);
    Ok(StaticSecret::from(arr))
}

/// Convert a 32-byte slice to an X25519 PublicKey.
fn bytes_to_public(bytes: &[u8]) -> Result<PublicKey, CryptoError> {
    if bytes.len() != 32 {
        return Err(CryptoError::InvalidKeyLength {
            expected: 32,
            actual: bytes.len(),
        });
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(bytes);
    Ok(PublicKey::from(arr))
}

/// Initiate an X3DH handshake (sender side).
///
/// Computes a shared secret from 3-4 DH exchanges plus a KEM encapsulation.
pub fn x3dh_initiate(
    my_identity_secret: &[u8],
    _my_identity_public: &[u8],
    bundle: &PreKeyBundle,
) -> Result<X3DHInitResult, CryptoError> {
    // Generate ephemeral X25519 keypair
    let ephemeral = crate::keys::generate_x25519_keypair();
    let ephemeral_public_bytes = ephemeral.public.as_bytes().to_vec();

    let identity_secret = bytes_to_secret(my_identity_secret)?;
    let their_identity_public = bytes_to_public(&bundle.identity_public)?;
    let their_signed_pre_key = bytes_to_public(&bundle.signed_pre_key)?;

    // DH1 = DH(identity_secret, signed_pre_key)
    let dh1 = identity_secret.diffie_hellman(&their_signed_pre_key);

    // DH2 = DH(ephemeral_secret, identity_public)
    let dh2 = ephemeral.secret.diffie_hellman(&their_identity_public);

    // DH3 = DH(ephemeral_secret, signed_pre_key)
    let dh3 = ephemeral.secret.diffie_hellman(&their_signed_pre_key);

    // DH4 = DH(ephemeral_secret, one_time_pre_key) if available
    let dh4 = if let Some(ref otpk) = bundle.one_time_pre_key {
        let their_otpk = bytes_to_public(otpk)?;
        Some(ephemeral.secret.diffie_hellman(&their_otpk))
    } else {
        None
    };

    // KEM encapsulation
    let kem_result = postquantum::kyber_encapsulate(&bundle.kyber_public)
        .map_err(|e| CryptoError::X3DHError(format!("KEM encapsulation failed: {}", e)))?;

    // Combine: DH1 || DH2 || DH3 || DH4 || kyber_secret
    let mut combined = Vec::new();
    combined.extend_from_slice(dh1.as_bytes());
    combined.extend_from_slice(dh2.as_bytes());
    combined.extend_from_slice(dh3.as_bytes());
    if let Some(ref dh4_val) = dh4 {
        combined.extend_from_slice(dh4_val.as_bytes());
    }
    combined.extend_from_slice(&kem_result.shared_secret);

    // Derive shared secret via HKDF
    let shared_secret = hkdf_derive(&combined, b"hysj-x3dh-v2", b"", 32);

    Ok(X3DHInitResult {
        shared_secret,
        ephemeral_public: ephemeral_public_bytes,
        kyber_ciphertext: kem_result.ciphertext,
        used_one_time_key: bundle.one_time_pre_key.is_some(),
    })
}

/// Respond to an X3DH handshake (recipient side).
///
/// Computes the same shared secret as the initiator.
pub fn x3dh_respond(
    my_identity_secret: &[u8],
    my_signed_pre_key_secret: &[u8],
    my_one_time_pre_key_secret: Option<&[u8]>,
    my_kyber_secret_key: &[u8],
    their_identity_public: &[u8],
    their_ephemeral_public: &[u8],
    kyber_ciphertext: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    let identity_secret = bytes_to_secret(my_identity_secret)?;
    let signed_pre_key_secret = bytes_to_secret(my_signed_pre_key_secret)?;
    let their_identity = bytes_to_public(their_identity_public)?;
    let their_ephemeral = bytes_to_public(their_ephemeral_public)?;

    // DH1 = DH(signed_pre_key_secret, their_identity_public)
    let dh1 = signed_pre_key_secret.diffie_hellman(&their_identity);

    // DH2 = DH(identity_secret, their_ephemeral_public)
    let dh2 = identity_secret.diffie_hellman(&their_ephemeral);

    // DH3 = DH(signed_pre_key_secret, their_ephemeral_public)
    let dh3 = signed_pre_key_secret.diffie_hellman(&their_ephemeral);

    // DH4 = DH(one_time_pre_key_secret, their_ephemeral_public) if available
    let dh4 = if let Some(otpk_bytes) = my_one_time_pre_key_secret {
        let otpk_secret = bytes_to_secret(otpk_bytes)?;
        Some(otpk_secret.diffie_hellman(&their_ephemeral))
    } else {
        None
    };

    // KEM decapsulation
    let kyber_shared = postquantum::kyber_decapsulate(kyber_ciphertext, my_kyber_secret_key)
        .map_err(|e| CryptoError::X3DHError(format!("KEM decapsulation failed: {}", e)))?;

    // Combine: DH1 || DH2 || DH3 || DH4 || kyber_secret
    let mut combined = Vec::new();
    combined.extend_from_slice(dh1.as_bytes());
    combined.extend_from_slice(dh2.as_bytes());
    combined.extend_from_slice(dh3.as_bytes());
    if let Some(ref dh4_val) = dh4 {
        combined.extend_from_slice(dh4_val.as_bytes());
    }
    combined.extend_from_slice(&kyber_shared);

    // Derive shared secret via HKDF
    let shared_secret = hkdf_derive(&combined, b"hysj-x3dh-v2", b"", 32);

    Ok(shared_secret)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keys;

    #[test]
    fn test_x3dh_handshake_with_one_time_key() {
        // Recipient generates keys
        let recipient_identity = keys::generate_x25519_keypair();
        let recipient_signed_pre = keys::generate_x25519_keypair();
        let recipient_otpk = keys::generate_x25519_keypair();
        let recipient_ed = keys::generate_ed25519_keypair();
        let recipient_kyber = postquantum::kyber_generate_keypair();

        // Sign the signed pre-key
        let spk_sig = keys::sign(
            &recipient_ed,
            recipient_signed_pre.public.as_bytes(),
        );

        let bundle = PreKeyBundle {
            identity_public: recipient_identity.public.as_bytes().to_vec(),
            signed_pre_key: recipient_signed_pre.public.as_bytes().to_vec(),
            signed_pre_key_sig: spk_sig,
            one_time_pre_key: Some(recipient_otpk.public.as_bytes().to_vec()),
            kyber_public: recipient_kyber.public_key.clone(),
        };

        // Sender generates identity
        let sender_identity = keys::generate_x25519_keypair();

        // Sender initiates
        let init_result = x3dh_initiate(
            sender_identity.secret.as_bytes(),
            sender_identity.public.as_bytes(),
            &bundle,
        )
        .unwrap();

        assert_eq!(init_result.shared_secret.len(), 32);
        assert!(init_result.used_one_time_key);

        // Recipient responds
        let response_secret = x3dh_respond(
            recipient_identity.secret.as_bytes(),
            recipient_signed_pre.secret.as_bytes(),
            Some(recipient_otpk.secret.as_bytes()),
            &recipient_kyber.secret_key,
            sender_identity.public.as_bytes(),
            &init_result.ephemeral_public,
            &init_result.kyber_ciphertext,
        )
        .unwrap();

        assert_eq!(init_result.shared_secret, response_secret);
    }

    #[test]
    fn test_x3dh_handshake_without_one_time_key() {
        let recipient_identity = keys::generate_x25519_keypair();
        let recipient_signed_pre = keys::generate_x25519_keypair();
        let recipient_ed = keys::generate_ed25519_keypair();
        let recipient_kyber = postquantum::kyber_generate_keypair();

        let spk_sig = keys::sign(
            &recipient_ed,
            recipient_signed_pre.public.as_bytes(),
        );

        let bundle = PreKeyBundle {
            identity_public: recipient_identity.public.as_bytes().to_vec(),
            signed_pre_key: recipient_signed_pre.public.as_bytes().to_vec(),
            signed_pre_key_sig: spk_sig,
            one_time_pre_key: None,
            kyber_public: recipient_kyber.public_key.clone(),
        };

        let sender_identity = keys::generate_x25519_keypair();

        let init_result = x3dh_initiate(
            sender_identity.secret.as_bytes(),
            sender_identity.public.as_bytes(),
            &bundle,
        )
        .unwrap();

        assert!(!init_result.used_one_time_key);

        let response_secret = x3dh_respond(
            recipient_identity.secret.as_bytes(),
            recipient_signed_pre.secret.as_bytes(),
            None,
            &recipient_kyber.secret_key,
            sender_identity.public.as_bytes(),
            &init_result.ephemeral_public,
            &init_result.kyber_ciphertext,
        )
        .unwrap();

        assert_eq!(init_result.shared_secret, response_secret);
    }
}
