use serde::{Deserialize, Serialize};
use x25519_dalek::{PublicKey, StaticSecret};

use crate::cipher;
use crate::kdf::hkdf_derive;
use crate::keys;
use crate::CryptoError;

/// A relay node in the onion route.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayNode {
    /// Network address of this relay node.
    pub address: String,
    /// X25519 public key of this relay node (32 bytes).
    pub public_key: Vec<u8>,
}

/// A peeled onion layer, revealing the next hop and inner payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnionLayer {
    /// Address of the next relay node (or "FINAL" for the last hop).
    pub next_hop: String,
    /// The remaining onion-encrypted payload.
    pub payload: Vec<u8>,
}

/// Wrap a payload in multiple layers of onion encryption.
///
/// The `route` specifies the relay nodes from first hop to last hop.
/// Each layer is encrypted for the corresponding relay node, wrapping
/// from inside out (last node first).
///
/// Output format per layer: ephemeral_public (32 bytes) || encrypted_layer.
pub fn wrap_onion(payload: &[u8], route: &[RelayNode]) -> Result<Vec<u8>, CryptoError> {
    if route.is_empty() {
        return Err(CryptoError::OnionError("route must have at least one node".to_string()));
    }

    let mut current_packet = payload.to_vec();

    // Wrap from inside out (last node first)
    for (i, node) in route.iter().enumerate().rev() {
        if node.public_key.len() != 32 {
            return Err(CryptoError::InvalidKeyLength {
                expected: 32,
                actual: node.public_key.len(),
            });
        }

        // Determine next_hop: the address of the next node, or "FINAL" for the innermost layer
        let next_hop = if i == route.len() - 1 {
            "FINAL".to_string()
        } else {
            route[i + 1].address.clone()
        };

        // 1. Generate ephemeral X25519 keypair
        let ephemeral = keys::generate_x25519_keypair();

        // 2. DH(ephemeral_secret, node.public_key) -> shared_secret
        let mut pk_bytes = [0u8; 32];
        pk_bytes.copy_from_slice(&node.public_key);
        let node_public = PublicKey::from(pk_bytes);
        let dh_shared = ephemeral.secret.diffie_hellman(&node_public);

        // 3. Derive encryption key
        let key_vec = hkdf_derive(dh_shared.as_bytes(), b"", b"hysj-onion-layer", 32);
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_vec);

        // 4. Create layer
        let layer = OnionLayer {
            next_hop,
            payload: current_packet,
        };
        let layer_bytes = serde_json::to_vec(&layer)
            .map_err(|e| CryptoError::SerializationError(e.to_string()))?;

        // 5. Encrypt layer
        let encrypted_layer = cipher::encrypt(&layer_bytes, &key, b"")?;

        // 6. current_packet = ephemeral_public || encrypted_layer
        let mut new_packet = Vec::with_capacity(32 + encrypted_layer.len());
        new_packet.extend_from_slice(ephemeral.public.as_bytes());
        new_packet.extend_from_slice(&encrypted_layer);
        current_packet = new_packet;
    }

    Ok(current_packet)
}

/// Unwrap one layer of onion encryption.
///
/// A relay node uses its private key to peel one layer, revealing
/// the next hop address and the inner payload to forward.
pub fn unwrap_layer(packet: &[u8], my_secret: &[u8]) -> Result<OnionLayer, CryptoError> {
    if packet.len() < 32 + 24 + 16 {
        return Err(CryptoError::OnionError("packet too short".to_string()));
    }
    if my_secret.len() != 32 {
        return Err(CryptoError::InvalidKeyLength {
            expected: 32,
            actual: my_secret.len(),
        });
    }

    // 1. Extract ephemeral_public (first 32 bytes)
    let (ephemeral_bytes, encrypted_layer) = packet.split_at(32);
    let mut eph_arr = [0u8; 32];
    eph_arr.copy_from_slice(ephemeral_bytes);
    let ephemeral_public = PublicKey::from(eph_arr);

    // 2. DH(my_secret, ephemeral_public) -> shared_secret
    let mut secret_arr = [0u8; 32];
    secret_arr.copy_from_slice(my_secret);
    let my_static_secret = StaticSecret::from(secret_arr);
    let dh_shared = my_static_secret.diffie_hellman(&ephemeral_public);

    // 3. Derive encryption key
    let key_vec = hkdf_derive(dh_shared.as_bytes(), b"", b"hysj-onion-layer", 32);
    let mut key = [0u8; 32];
    key.copy_from_slice(&key_vec);

    // 4. Decrypt the layer
    let layer_bytes = cipher::decrypt(encrypted_layer, &key, b"")?;

    // 5. Deserialize -> OnionLayer
    let layer: OnionLayer = serde_json::from_slice(&layer_bytes)
        .map_err(|e| CryptoError::DeserializationError(e.to_string()))?;

    Ok(layer)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_hop_onion() {
        let relay = keys::generate_x25519_keypair();

        let route = vec![RelayNode {
            address: "relay1:9001".to_string(),
            public_key: relay.public.as_bytes().to_vec(),
        }];

        let payload = b"final payload";
        let packet = wrap_onion(payload, &route).unwrap();

        let layer = unwrap_layer(&packet, relay.secret.as_bytes()).unwrap();
        assert_eq!(layer.next_hop, "FINAL");
        assert_eq!(layer.payload, payload);
    }

    #[test]
    fn test_three_hop_onion() {
        let relay1 = keys::generate_x25519_keypair();
        let relay2 = keys::generate_x25519_keypair();
        let relay3 = keys::generate_x25519_keypair();

        let route = vec![
            RelayNode {
                address: "relay1:9001".to_string(),
                public_key: relay1.public.as_bytes().to_vec(),
            },
            RelayNode {
                address: "relay2:9002".to_string(),
                public_key: relay2.public.as_bytes().to_vec(),
            },
            RelayNode {
                address: "relay3:9003".to_string(),
                public_key: relay3.public.as_bytes().to_vec(),
            },
        ];

        let payload = b"hello through the onion";
        let packet = wrap_onion(payload, &route).unwrap();

        // Relay 1 peels first layer
        let layer1 = unwrap_layer(&packet, relay1.secret.as_bytes()).unwrap();
        assert_eq!(layer1.next_hop, "relay2:9002");

        // Relay 2 peels second layer
        let layer2 = unwrap_layer(&layer1.payload, relay2.secret.as_bytes()).unwrap();
        assert_eq!(layer2.next_hop, "relay3:9003");

        // Relay 3 peels final layer
        let layer3 = unwrap_layer(&layer2.payload, relay3.secret.as_bytes()).unwrap();
        assert_eq!(layer3.next_hop, "FINAL");
        assert_eq!(layer3.payload, payload);
    }

    #[test]
    fn test_wrong_key_fails() {
        let relay = keys::generate_x25519_keypair();
        let wrong = keys::generate_x25519_keypair();

        let route = vec![RelayNode {
            address: "relay:9001".to_string(),
            public_key: relay.public.as_bytes().to_vec(),
        }];

        let packet = wrap_onion(b"secret", &route).unwrap();
        let result = unwrap_layer(&packet, wrong.secret.as_bytes());
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_route_fails() {
        let result = wrap_onion(b"payload", &[]);
        assert!(result.is_err());
    }
}
