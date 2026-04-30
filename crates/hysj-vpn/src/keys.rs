use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use x25519_dalek::{PublicKey, StaticSecret};

/// Generate a WireGuard X25519 keypair.
///
/// Returns `(private_key_base64, public_key_base64)`.
pub fn generate_keypair() -> (String, String) {
    let mut rng = rand::thread_rng();
    let secret = StaticSecret::random_from_rng(&mut rng);
    let public = PublicKey::from(&secret);

    (B64.encode(secret.to_bytes()), B64.encode(public.as_bytes()))
}

/// Generate a random 256-bit pre-shared key, base64-encoded.
pub fn generate_preshared_key() -> String {
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    B64.encode(key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keypair_roundtrip() {
        let (priv_key, pub_key) = generate_keypair();
        assert_eq!(B64.decode(&priv_key).unwrap().len(), 32);
        assert_eq!(B64.decode(&pub_key).unwrap().len(), 32);
        // Public key should differ from private key
        assert_ne!(priv_key, pub_key);
    }

    #[test]
    fn keypair_deterministic_pubkey() {
        // Same private key should always give same public key
        let (priv1, pub1) = generate_keypair();
        let priv_bytes: [u8; 32] = B64.decode(&priv1).unwrap().try_into().unwrap();
        let secret = StaticSecret::from(priv_bytes);
        let public = PublicKey::from(&secret);
        assert_eq!(pub1, B64.encode(public.as_bytes()));
    }

    #[test]
    fn preshared_key_length() {
        let psk = generate_preshared_key();
        assert_eq!(B64.decode(&psk).unwrap().len(), 32);
    }
}
