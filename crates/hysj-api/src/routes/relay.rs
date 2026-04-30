use std::sync::Arc;

use axum::extract::State;
use axum::Json;
use serde::Serialize;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct RelayNodeDto {
    pub id: Uuid,
    pub address: String,
    pub public_key: String,
    pub region: String,
    pub load_percent: u8,
}

/// GET /api/relay/nodes
pub async fn list_nodes(
    State(_state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Result<Json<Vec<RelayNodeDto>>, AppError> {
    let nodes = vec![
        RelayNodeDto {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            address: "relay-eu-1.hysj.no:9001".to_string(),
            public_key: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".to_string(),
            region: "eu-west-1".to_string(),
            load_percent: 35,
        },
        RelayNodeDto {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap(),
            address: "relay-eu-2.hysj.no:9001".to_string(),
            public_key: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=".to_string(),
            region: "eu-north-1".to_string(),
            load_percent: 22,
        },
        RelayNodeDto {
            id: Uuid::parse_str("00000000-0000-0000-0000-000000000003").unwrap(),
            address: "relay-us-1.hysj.no:9001".to_string(),
            public_key: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=".to_string(),
            region: "us-east-1".to_string(),
            load_percent: 48,
        },
    ];

    Ok(Json(nodes))
}
