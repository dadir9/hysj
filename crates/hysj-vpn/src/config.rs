use serde::{Deserialize, Serialize};

/// Represents a complete WireGuard client configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WireGuardConfig {
    pub interface_private_key: String,
    /// e.g., "10.0.0.2/32"
    pub interface_address: String,
    /// e.g., "1.1.1.1"
    pub dns: String,
    /// Server's public key
    pub peer_public_key: String,
    /// e.g., "vpn.hysj.app:51820"
    pub peer_endpoint: String,
    /// "0.0.0.0/0" for full tunnel
    pub allowed_ips: String,
}

impl WireGuardConfig {
    /// Generate the standard WireGuard INI config file format.
    pub fn to_ini_string(&self) -> String {
        format!(
            "[Interface]\n\
             PrivateKey = {}\n\
             Address = {}\n\
             DNS = {}\n\
             \n\
             [Peer]\n\
             PublicKey = {}\n\
             Endpoint = {}\n\
             AllowedIPs = {}\n",
            self.interface_private_key,
            self.interface_address,
            self.dns,
            self.peer_public_key,
            self.peer_endpoint,
            self.allowed_ips,
        )
    }

    /// Serialize to a JSON value.
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "interface": {
                "private_key": self.interface_private_key,
                "address": self.interface_address,
                "dns": self.dns,
            },
            "peer": {
                "public_key": self.peer_public_key,
                "endpoint": self.peer_endpoint,
                "allowed_ips": self.allowed_ips,
            }
        })
    }
}
