use serde::{Deserialize, Serialize};

/// Header sent with each Double Ratchet message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageHeader {
    /// Sender's current ratchet DH public key.
    pub dh_public: Vec<u8>,
    /// Number of messages in the previous sending chain.
    pub previous_chain_length: u32,
    /// Message number in the current sending chain.
    pub message_number: u32,
}

impl MessageHeader {
    /// Create a new message header.
    pub fn new(dh_public: Vec<u8>, previous_chain_length: u32, message_number: u32) -> Self {
        Self {
            dh_public,
            previous_chain_length,
            message_number,
        }
    }

    /// Serialize the header to bytes (for use as AAD in encryption).
    pub fn to_bytes(&self) -> Vec<u8> {
        serde_json::to_vec(self).expect("header serialization should not fail")
    }
}
