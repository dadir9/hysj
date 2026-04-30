use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey, StaticSecret};
use zeroize::Zeroize;

use crate::cipher;
use crate::kdf;
use crate::keys;
use crate::ratchet::header::MessageHeader;
use crate::ratchet::skipped::SkippedKeys;
use crate::CryptoError;

/// Maximum number of message keys to skip when catching up.
const MAX_SKIP: u32 = 1000;

/// The core Double Ratchet state.
///
/// Implements the Signal Double Ratchet algorithm for forward-secret,
/// post-compromise-secure message encryption.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatchetState {
    root_key: Vec<u8>,
    sending_chain_key: Option<Vec<u8>>,
    receiving_chain_key: Option<Vec<u8>>,
    /// Our current DH private key (raw 32 bytes).
    dh_send_secret: Vec<u8>,
    /// Our current DH public key (raw 32 bytes).
    dh_send_public: Vec<u8>,
    /// Their current DH public key (raw 32 bytes).
    dh_receive_public: Option<Vec<u8>>,
    send_message_number: u32,
    recv_message_number: u32,
    previous_sending_chain_length: u32,
    skipped_keys: SkippedKeys,
}

impl RatchetState {
    /// Initialize the ratchet as the sender (Alice).
    ///
    /// The sender performs the first DH ratchet step immediately using the
    /// recipient's DH public key from the X3DH handshake.
    pub fn init_sender(shared_secret: &[u8], recipient_dh_public: &[u8]) -> Self {
        let dh_keypair = keys::generate_x25519_keypair();
        let dh_send_secret = dh_keypair.secret.as_bytes().to_vec();
        let dh_send_public = dh_keypair.public.as_bytes().to_vec();

        // Perform initial DH
        let their_public = to_x25519_public(recipient_dh_public);
        let dh_output = dh_keypair.secret.diffie_hellman(&their_public);

        // Derive root key and sending chain key
        let (root_key, sending_chain_key) = kdf::derive_root_key(shared_secret, dh_output.as_bytes());

        RatchetState {
            root_key,
            sending_chain_key: Some(sending_chain_key),
            receiving_chain_key: None,
            dh_send_secret,
            dh_send_public,
            dh_receive_public: Some(recipient_dh_public.to_vec()),
            send_message_number: 0,
            recv_message_number: 0,
            previous_sending_chain_length: 0,
            skipped_keys: SkippedKeys::new(),
        }
    }

    /// Initialize the ratchet as the receiver (Bob).
    ///
    /// Bob uses his signed pre-key (or equivalent) as the initial DH keypair.
    /// The first DH ratchet step will happen upon receiving Alice's first message.
    pub fn init_receiver(shared_secret: &[u8], our_dh_keypair: (&[u8], &[u8])) -> Self {
        let (secret_bytes, public_bytes) = our_dh_keypair;

        RatchetState {
            root_key: shared_secret.to_vec(),
            sending_chain_key: None,
            receiving_chain_key: None,
            dh_send_secret: secret_bytes.to_vec(),
            dh_send_public: public_bytes.to_vec(),
            dh_receive_public: None,
            send_message_number: 0,
            recv_message_number: 0,
            previous_sending_chain_length: 0,
            skipped_keys: SkippedKeys::new(),
        }
    }

    /// Encrypt a plaintext message.
    ///
    /// Returns the ciphertext and a message header that must be sent alongside it.
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<(Vec<u8>, MessageHeader), CryptoError> {
        let sending_ck = self.sending_chain_key.as_ref().ok_or_else(|| {
            CryptoError::RatchetError("no sending chain key established".to_string())
        })?;

        // Derive message key from sending chain
        let (new_chain_key, message_key_vec) = kdf::derive_chain_key(sending_ck);
        self.sending_chain_key = Some(new_chain_key);

        let mut message_key = [0u8; 32];
        message_key.copy_from_slice(&message_key_vec[..32]);

        // Create header
        let header = MessageHeader::new(
            self.dh_send_public.clone(),
            self.previous_sending_chain_length,
            self.send_message_number,
        );

        // Encrypt with header as AAD
        let aad = header.to_bytes();
        let ciphertext = cipher::encrypt(plaintext, &message_key, &aad)?;

        self.send_message_number += 1;

        // Zero message key
        message_key.zeroize();

        Ok((ciphertext, header))
    }

    /// Decrypt a received ciphertext using the provided header.
    pub fn decrypt(
        &mut self,
        ciphertext: &[u8],
        header: &MessageHeader,
    ) -> Result<Vec<u8>, CryptoError> {
        let header_dh_hex = hex_encode(&header.dh_public);

        // 1. Check skipped keys first (for out-of-order messages)
        if let Some(mut msg_key_vec) = self.skipped_keys.take(&header_dh_hex, header.message_number)
        {
            let mut message_key = [0u8; 32];
            message_key.copy_from_slice(&msg_key_vec[..32]);
            msg_key_vec.zeroize();

            let aad = header.to_bytes();
            let plaintext = cipher::decrypt(ciphertext, &message_key, &aad)?;
            message_key.zeroize();
            return Ok(plaintext);
        }

        // 2. If header.dh_public != dh_receive_public, perform DH ratchet step
        let need_ratchet = match &self.dh_receive_public {
            Some(current) => current != &header.dh_public,
            None => true,
        };

        if need_ratchet {
            self.skip_missed_messages(header.previous_chain_length)?;
            self.dh_ratchet(&header.dh_public)?;
        }

        // 3. Skip any missed messages in the current receiving chain
        self.skip_missed_messages(header.message_number)?;

        // 4. Derive message key from receiving chain
        let receiving_ck = self.receiving_chain_key.as_ref().ok_or_else(|| {
            CryptoError::RatchetError("no receiving chain key".to_string())
        })?;

        let (new_chain_key, message_key_vec) = kdf::derive_chain_key(receiving_ck);
        self.receiving_chain_key = Some(new_chain_key);

        let mut message_key = [0u8; 32];
        message_key.copy_from_slice(&message_key_vec[..32]);

        // 5. Decrypt
        let aad = header.to_bytes();
        let plaintext = cipher::decrypt(ciphertext, &message_key, &aad)?;

        self.recv_message_number += 1;

        // 6. Zero message key
        message_key.zeroize();

        Ok(plaintext)
    }

    /// Perform a DH ratchet step with a new public key from the other party.
    fn dh_ratchet(&mut self, their_dh_public: &[u8]) -> Result<(), CryptoError> {
        self.dh_receive_public = Some(their_dh_public.to_vec());

        // Save current sending chain length
        self.previous_sending_chain_length = self.send_message_number;
        self.send_message_number = 0;
        self.recv_message_number = 0;

        let their_public = to_x25519_public(their_dh_public);

        // DH with their new public key using our current secret
        let current_secret = to_x25519_secret(&self.dh_send_secret);
        let dh_output = current_secret.diffie_hellman(&their_public);

        // Derive new root_key and receiving_chain_key
        let (new_root_key, receiving_chain_key) =
            kdf::derive_root_key(&self.root_key, dh_output.as_bytes());
        self.root_key = new_root_key;
        self.receiving_chain_key = Some(receiving_chain_key);

        // Generate new DH keypair
        let new_keypair = keys::generate_x25519_keypair();
        self.dh_send_secret = new_keypair.secret.as_bytes().to_vec();
        self.dh_send_public = new_keypair.public.as_bytes().to_vec();

        // DH with their public key using new secret
        let dh_output2 = new_keypair.secret.diffie_hellman(&their_public);

        // Derive new root_key and sending_chain_key
        let (new_root_key2, sending_chain_key) =
            kdf::derive_root_key(&self.root_key, dh_output2.as_bytes());
        self.root_key = new_root_key2;
        self.sending_chain_key = Some(sending_chain_key);

        Ok(())
    }

    /// Skip missed messages by advancing the receiving chain and storing keys.
    fn skip_missed_messages(&mut self, until: u32) -> Result<(), CryptoError> {
        if self.recv_message_number > until {
            return Ok(());
        }

        let skip_count = until - self.recv_message_number;
        if skip_count > MAX_SKIP {
            return Err(CryptoError::RatchetError(format!(
                "too many skipped messages: {}",
                skip_count
            )));
        }

        if let Some(ref mut receiving_ck) = self.receiving_chain_key.clone() {
            let dh_hex = self
                .dh_receive_public
                .as_ref()
                .map(|pk| hex_encode(pk))
                .unwrap_or_default();

            let mut current_ck = receiving_ck.clone();
            for n in self.recv_message_number..until {
                let (new_ck, msg_key) = kdf::derive_chain_key(&current_ck);
                self.skipped_keys.insert(dh_hex.clone(), n, msg_key);
                current_ck = new_ck;
            }
            self.receiving_chain_key = Some(current_ck);
            self.recv_message_number = until;
        }

        Ok(())
    }

    /// Serialize the ratchet state to JSON bytes.
    pub fn serialize(&self) -> Vec<u8> {
        serde_json::to_vec(self).expect("ratchet state serialization should not fail")
    }

    /// Deserialize ratchet state from JSON bytes.
    pub fn deserialize(data: &[u8]) -> Result<Self, CryptoError> {
        serde_json::from_slice(data)
            .map_err(|e| CryptoError::DeserializationError(e.to_string()))
    }
}

impl Drop for RatchetState {
    fn drop(&mut self) {
        self.root_key.zeroize();
        if let Some(ref mut ck) = self.sending_chain_key {
            ck.zeroize();
        }
        if let Some(ref mut ck) = self.receiving_chain_key {
            ck.zeroize();
        }
        self.dh_send_secret.zeroize();
    }
}

/// Convert raw bytes to an X25519 PublicKey.
fn to_x25519_public(bytes: &[u8]) -> PublicKey {
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes[..32]);
    PublicKey::from(arr)
}

/// Convert raw bytes to an X25519 StaticSecret.
fn to_x25519_secret(bytes: &[u8]) -> StaticSecret {
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes[..32]);
    StaticSecret::from(arr)
}

/// Simple hex encoding for key identification.
fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_send_receive() {
        let shared_secret = [0x42u8; 32];

        // Bob's initial DH keypair (used during X3DH)
        let bob_dh = keys::generate_x25519_keypair();

        // Alice initializes as sender
        let mut alice = RatchetState::init_sender(&shared_secret, bob_dh.public.as_bytes());

        // Bob initializes as receiver
        let mut bob = RatchetState::init_receiver(
            &shared_secret,
            (bob_dh.secret.as_bytes(), bob_dh.public.as_bytes()),
        );

        // Alice sends a message
        let (ct1, hdr1) = alice.encrypt(b"Hello Bob!").unwrap();
        let pt1 = bob.decrypt(&ct1, &hdr1).unwrap();
        assert_eq!(pt1, b"Hello Bob!");

        // Alice sends another
        let (ct2, hdr2) = alice.encrypt(b"How are you?").unwrap();
        let pt2 = bob.decrypt(&ct2, &hdr2).unwrap();
        assert_eq!(pt2, b"How are you?");

        // Bob replies (triggers DH ratchet on Alice's side)
        let (ct3, hdr3) = bob.encrypt(b"I'm fine!").unwrap();
        let pt3 = alice.decrypt(&ct3, &hdr3).unwrap();
        assert_eq!(pt3, b"I'm fine!");

        // Alice responds again
        let (ct4, hdr4) = alice.encrypt(b"Great!").unwrap();
        let pt4 = bob.decrypt(&ct4, &hdr4).unwrap();
        assert_eq!(pt4, b"Great!");
    }

    #[test]
    fn test_out_of_order_messages() {
        let shared_secret = [0x55u8; 32];
        let bob_dh = keys::generate_x25519_keypair();

        let mut alice = RatchetState::init_sender(&shared_secret, bob_dh.public.as_bytes());
        let mut bob = RatchetState::init_receiver(
            &shared_secret,
            (bob_dh.secret.as_bytes(), bob_dh.public.as_bytes()),
        );

        // Alice sends three messages
        let (ct1, hdr1) = alice.encrypt(b"msg1").unwrap();
        let (ct2, hdr2) = alice.encrypt(b"msg2").unwrap();
        let (ct3, hdr3) = alice.encrypt(b"msg3").unwrap();

        // Bob receives them out of order: 3, 1, 2
        let pt3 = bob.decrypt(&ct3, &hdr3).unwrap();
        assert_eq!(pt3, b"msg3");

        let pt1 = bob.decrypt(&ct1, &hdr1).unwrap();
        assert_eq!(pt1, b"msg1");

        let pt2 = bob.decrypt(&ct2, &hdr2).unwrap();
        assert_eq!(pt2, b"msg2");
    }

    #[test]
    fn test_serialize_deserialize() {
        let shared_secret = [0x77u8; 32];
        let bob_dh = keys::generate_x25519_keypair();

        let mut alice = RatchetState::init_sender(&shared_secret, bob_dh.public.as_bytes());
        let _ = alice.encrypt(b"test").unwrap();

        let serialized = alice.serialize();
        let restored = RatchetState::deserialize(&serialized).unwrap();

        assert_eq!(alice.send_message_number, restored.send_message_number);
        assert_eq!(alice.dh_send_public, restored.dh_send_public);
    }
}
