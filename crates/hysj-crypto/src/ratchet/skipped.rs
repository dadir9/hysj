use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use zeroize::Zeroize;

/// Maximum number of skipped message keys to store.
const MAX_SKIPPED_KEYS: usize = 1000;

/// Cache for out-of-order message keys.
///
/// Stores message keys indexed by (DH public key hex, message number) so
/// that messages received out of order can still be decrypted.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkippedKeys {
    /// Map from (dh_public_hex, message_number) -> message_key bytes.
    keys: HashMap<(String, u32), Vec<u8>>,
    /// Insertion order for eviction (oldest first).
    insertion_order: Vec<(String, u32)>,
}

impl SkippedKeys {
    /// Create an empty skipped keys cache.
    pub fn new() -> Self {
        Self {
            keys: HashMap::new(),
            insertion_order: Vec::new(),
        }
    }

    /// Insert a skipped message key. Evicts the oldest entry if at capacity.
    pub fn insert(&mut self, dh_public_hex: String, message_number: u32, message_key: Vec<u8>) {
        let key = (dh_public_hex, message_number);

        // If already present, don't duplicate in insertion_order
        if self.keys.contains_key(&key) {
            self.keys.insert(key, message_key);
            return;
        }

        // Evict oldest if at capacity
        while self.keys.len() >= MAX_SKIPPED_KEYS {
            if let Some(oldest) = self.insertion_order.first().cloned() {
                self.insertion_order.remove(0);
                if let Some(mut old_key) = self.keys.remove(&oldest) {
                    old_key.zeroize();
                }
            } else {
                break;
            }
        }

        self.insertion_order.push(key.clone());
        self.keys.insert(key, message_key);
    }

    /// Try to retrieve and remove a skipped message key.
    pub fn take(&mut self, dh_public_hex: &str, message_number: u32) -> Option<Vec<u8>> {
        let key = (dh_public_hex.to_string(), message_number);
        if let Some(msg_key) = self.keys.remove(&key) {
            self.insertion_order.retain(|k| k != &key);
            Some(msg_key)
        } else {
            None
        }
    }

    /// Check if a key exists for the given DH public key and message number.
    pub fn contains(&self, dh_public_hex: &str, message_number: u32) -> bool {
        self.keys
            .contains_key(&(dh_public_hex.to_string(), message_number))
    }

    /// Number of stored skipped keys.
    pub fn len(&self) -> usize {
        self.keys.len()
    }

    /// Whether the cache is empty.
    pub fn is_empty(&self) -> bool {
        self.keys.is_empty()
    }
}

impl Default for SkippedKeys {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for SkippedKeys {
    fn drop(&mut self) {
        for (_, v) in self.keys.iter_mut() {
            v.zeroize();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insert_and_take() {
        let mut sk = SkippedKeys::new();
        sk.insert("aabbcc".to_string(), 5, vec![0x42; 32]);

        assert!(sk.contains("aabbcc", 5));
        assert!(!sk.contains("aabbcc", 6));

        let key = sk.take("aabbcc", 5).unwrap();
        assert_eq!(key, vec![0x42; 32]);
        assert!(!sk.contains("aabbcc", 5));
    }

    #[test]
    fn test_eviction() {
        let mut sk = SkippedKeys::new();
        for i in 0..1000 {
            sk.insert("key".to_string(), i, vec![i as u8; 32]);
        }
        assert_eq!(sk.len(), 1000);

        // Inserting one more should evict the oldest (message_number = 0)
        sk.insert("key".to_string(), 1000, vec![0xFF; 32]);
        assert_eq!(sk.len(), 1000);
        assert!(!sk.contains("key", 0));
        assert!(sk.contains("key", 1000));
    }
}
