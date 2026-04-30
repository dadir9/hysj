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
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Result<Json<Vec<RelayNodeDto>>, AppError> {
    let nodes = hysj_db::relay::list_active_nodes(&state.db).await?;

    let dtos: Vec<RelayNodeDto> = nodes
        .into_iter()
        .map(|n| RelayNodeDto {
            id: n.id,
            address: n.address,
            public_key: n.public_key,
            region: n.region,
            load_percent: n.load_percent.clamp(0, 100) as u8,
        })
        .collect();

    Ok(Json(dtos))
}
