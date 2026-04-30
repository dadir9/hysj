use ml_kem::kem::{Decapsulate, Encapsulate};
use ml_kem::{EncodedSizeUser, KemCore, MlKem768};
use rand::rngs::OsRng;

use crate::CryptoError;

/// ML-KEM-768 public/secret key pair.
pub struct KyberKeyPair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

/// Result of KEM encapsulation.
pub struct KyberEncapResult {
    pub ciphertext: Vec<u8>,
    pub shared_secret: Vec<u8>,
}

/// Generate a real ML-KEM-768 key pair.
pub fn kyber_generate_keypair() -> KyberKeyPair {
    let (dk, ek) = MlKem768::generate(&mut OsRng);

    KyberKeyPair {
        public_key: ek.as_bytes().to_vec(),
        secret_key: dk.as_bytes().to_vec(),
    }
}

/// Encapsulate: produce a ciphertext and shared secret given a public key.
pub fn kyber_encapsulate(public_key: &[u8]) -> Result<KyberEncapResult, CryptoError> {
    let ek = <MlKem768 as KemCore>::EncapsulationKey::from_bytes(
        public_key.try_into().map_err(|_| {
            CryptoError::PostQuantumError(format!(
                "invalid public key length: got {}",
                public_key.len()
            ))
        })?,
    );

    let (ct, ss) = ek.encapsulate(&mut OsRng).map_err(|e| {
        CryptoError::PostQuantumError(format!("encapsulation failed: {:?}", e))
    })?;

    Ok(KyberEncapResult {
        ciphertext: AsRef::<[u8]>::as_ref(&ct).to_vec(),
        shared_secret: AsRef::<[u8]>::as_ref(&ss).to_vec(),
    })
}

/// Decapsulate: recover the shared secret from a ciphertext and secret key.
pub fn kyber_decapsulate(ciphertext: &[u8], secret_key: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let dk = <MlKem768 as KemCore>::DecapsulationKey::from_bytes(
        secret_key.try_into().map_err(|_| {
            CryptoError::PostQuantumError(format!(
                "invalid secret key length: got {}",
                secret_key.len()
            ))
        })?,
    );

    let ct = ciphertext.try_into().map_err(|_| {
        CryptoError::PostQuantumError(format!(
            "invalid ciphertext length: got {}",
            ciphertext.len()
        ))
    })?;

    let ss = dk.decapsulate(ct).map_err(|e| {
        CryptoError::PostQuantumError(format!("decapsulation failed: {:?}", e))
    })?;

    Ok(AsRef::<[u8]>::as_ref(&ss).to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kyber_roundtrip() {
        let keypair = kyber_generate_keypair();

        let encap = kyber_encapsulate(&keypair.public_key).unwrap();
        assert_eq!(encap.shared_secret.len(), 32);

        let decap_secret =
            kyber_decapsulate(&encap.ciphertext, &keypair.secret_key).unwrap();
        assert_eq!(decap_secret.len(), 32);
        assert_eq!(encap.shared_secret, decap_secret);
    }

    #[test]
    fn test_kyber_invalid_lengths() {
        assert!(kyber_encapsulate(&[0u8; 100]).is_err());
        assert!(kyber_decapsulate(&[0u8; 100], &kyber_generate_keypair().secret_key).is_err());
        assert!(kyber_decapsulate(&kyber_generate_keypair().public_key, &[0u8; 100]).is_err());
    }
}
