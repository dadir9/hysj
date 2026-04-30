use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreKeyBundleRequest {
    pub signed_pre_key: String,
    pub signed_pre_key_signature: String,
    pub kyber_public_key: String,
    pub one_time_pre_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreKeyBundleResponse {
    pub identity_public_key: String,
    pub signed_pre_key: String,
    pub signed_pre_key_signature: String,
    pub one_time_pre_key: Option<String>,
    pub kyber_public_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplenishPreKeysRequest {
    pub pre_keys: Vec<String>,
}
