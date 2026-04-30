use crate::kdf;
use zeroize::Zeroize;

/// A symmetric ratchet chain that derives message keys.
#[derive(Debug, Clone)]
pub struct Chain {
    chain_key: Vec<u8>,
    message_number: u32,
}

impl Chain {
    /// Create a new chain from an initial chain key.
    pub fn new(chain_key: Vec<u8>) -> Self {
        Self {
            chain_key,
            message_number: 0,
        }
    }

    /// Advance the chain: derive the next message key and update the chain key.
    ///
    /// Returns the 32-byte message key for encrypting/decrypting one message.
    pub fn advance(&mut self) -> [u8; 32] {
        let (new_chain_key, message_key_vec) = kdf::derive_chain_key(&self.chain_key);

        // Zeroize old chain key
        self.chain_key.zeroize();
        self.chain_key = new_chain_key;
        self.message_number += 1;

        let mut message_key = [0u8; 32];
        message_key.copy_from_slice(&message_key_vec[..32]);
        message_key
    }

    /// Get the current message number (how many keys have been derived).
    pub fn message_number(&self) -> u32 {
        self.message_number
    }

    /// Get the current chain key (for serialization).
    pub fn chain_key(&self) -> &[u8] {
        &self.chain_key
    }
}

impl Drop for Chain {
    fn drop(&mut self) {
        self.chain_key.zeroize();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chain_advance() {
        let mut chain = Chain::new(vec![0xAA; 32]);
        let key1 = chain.advance();
        let key2 = chain.advance();

        assert_eq!(chain.message_number(), 2);
        assert_ne!(key1, key2);
        assert_ne!(key1, [0u8; 32]);
    }

    #[test]
    fn test_chain_deterministic() {
        let mut chain1 = Chain::new(vec![0xBB; 32]);
        let mut chain2 = Chain::new(vec![0xBB; 32]);

        let key1 = chain1.advance();
        let key2 = chain2.advance();
        assert_eq!(key1, key2);
    }
}
