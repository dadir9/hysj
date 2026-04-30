pub mod keys;
pub mod cipher;
pub mod kdf;
pub mod x3dh;
pub mod ratchet;
pub mod sealed;
pub mod onion;
pub mod postquantum;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("invalid key length: expected {expected}, got {actual}")]
    InvalidKeyLength { expected: usize, actual: usize },

    #[error("invalid signature")]
    InvalidSignature,

    #[error("key derivation failed: {0}")]
    KdfError(String),

    #[error("serialization failed: {0}")]
    SerializationError(String),

    #[error("deserialization failed: {0}")]
    DeserializationError(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("x3dh handshake failed: {0}")]
    X3DHError(String),

    #[error("ratchet error: {0}")]
    RatchetError(String),

    #[error("sealed sender error: {0}")]
    SealedSenderError(String),

    #[error("onion routing error: {0}")]
    OnionError(String),

    #[error("post-quantum error: {0}")]
    PostQuantumError(String),
}
