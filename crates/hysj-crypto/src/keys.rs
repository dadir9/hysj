use ed25519_dalek::{Signer, Verifier};
use rand::rngs::OsRng;
use x25519_dalek::{PublicKey, SharedSecret, StaticSecret};
use zeroize::Zeroize;

/// X25519 key pair for Diffie-Hellman key exchange.
pub struct X25519KeyPair {
    pub secret: StaticSecret,
    pub public: PublicKey,
}

/// Generate a new random X25519 key pair.
pub fn generate_x25519_keypair() -> X25519KeyPair {
    let secret = StaticSecret::random_from_rng(OsRng);
    let public = PublicKey::from(&secret);
    X25519KeyPair { secret, public }
}

/// Perform X25519 Diffie-Hellman key exchange.
pub fn diffie_hellman(my_secret: &StaticSecret, their_public: &PublicKey) -> SharedSecret {
    my_secret.diffie_hellman(their_public)
}

/// Ed25519 key pair for digital signatures.
pub struct Ed25519KeyPair {
    pub signing_key: ed25519_dalek::SigningKey,
    pub verifying_key: ed25519_dalek::VerifyingKey,
}

/// Generate a new random Ed25519 signing key pair.
pub fn generate_ed25519_keypair() -> Ed25519KeyPair {
    let signing_key = ed25519_dalek::SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();
    Ed25519KeyPair {
        signing_key,
        verifying_key,
    }
}

/// Sign a message with an Ed25519 key pair.
pub fn sign(keypair: &Ed25519KeyPair, message: &[u8]) -> Vec<u8> {
    let signature = keypair.signing_key.sign(message);
    signature.to_bytes().to_vec()
}

/// Verify an Ed25519 signature. Returns true if valid.
pub fn verify(
    public_key: &ed25519_dalek::VerifyingKey,
    message: &[u8],
    signature: &[u8],
) -> bool {
    if signature.len() != 64 {
        return false;
    }
    let mut sig_bytes = [0u8; 64];
    sig_bytes.copy_from_slice(signature);
    match ed25519_dalek::Signature::from_bytes(&sig_bytes) {
        sig => public_key.verify(message, &sig).is_ok(),
    }
}

/// Securely zero memory using zeroize.
pub fn zero_memory(buf: &mut [u8]) {
    buf.zeroize();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_x25519_key_exchange() {
        let alice = generate_x25519_keypair();
        let bob = generate_x25519_keypair();
        let alice_shared = diffie_hellman(&alice.secret, &bob.public);
        let bob_shared = diffie_hellman(&bob.secret, &alice.public);
        assert_eq!(alice_shared.as_bytes(), bob_shared.as_bytes());
    }

    #[test]
    fn test_ed25519_sign_verify() {
        let keypair = generate_ed25519_keypair();
        let message = b"hello hysj";
        let sig = sign(&keypair, message);
        assert!(verify(&keypair.verifying_key, message, &sig));
        assert!(!verify(&keypair.verifying_key, b"wrong message", &sig));
    }

    #[test]
    fn test_zero_memory() {
        let mut buf = vec![0xFFu8; 32];
        zero_memory(&mut buf);
        assert!(buf.iter().all(|&b| b == 0));
    }
}
