use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use hysj_shared::dto::vpn::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

/// Derive a VPN encryption key from the server's cert signing seed.
fn vpn_encryption_key(seed: &[u8; 32]) -> [u8; 32] {
    let derived = hysj_crypto::kdf::hkdf_derive(seed, b"hysj-vpn-key-encryption", b"", 32);
    let mut key = [0u8; 32];
    key.copy_from_slice(&derived);
    key
}

/// POST /api/vpn/connect — generate WireGuard keypair for user if not exists, create session, return config
pub async fn connect(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(req): Json<VpnConnectRequest>,
) -> Result<Json<VpnConnectResponse>, AppError> {
    // Get the server
    let servers = hysj_db::vpn::list_servers(&state.db).await?;
    let server = servers
        .iter()
        .find(|s| s.id == req.server_id)
        .ok_or(AppError(HysjError::ValidationError(
            "Server not found".into(),
        )))?;

    if server.current_connections >= server.max_connections {
        return Err(AppError(HysjError::ValidationError(
            "Server is full".into(),
        )));
    }

    // End any existing active session
    if let Some(existing) = hysj_db::vpn::get_active_session(&state.db, auth.user_id).await? {
        hysj_db::vpn::end_session(&state.db, existing.id).await?;
    }

    let enc_key = vpn_encryption_key(&state.config.cert_signing_seed);

    // Generate keypair for the user if they don't have one
    let keys = hysj_db::vpn::get_vpn_keys(&state.db, auth.user_id).await?;
    let (private_key, public_key) = if let Some(existing_keys) = keys {
        // Decrypt the stored private key
        let decrypted = hysj_crypto::cipher::decrypt(
            &existing_keys.private_key_encrypted,
            &enc_key,
            auth.user_id.as_bytes(),
        )
        .map_err(|e| AppError(HysjError::InternalError(format!("Key decryption failed: {}", e))))?;
        let priv_key = String::from_utf8(decrypted)
            .map_err(|_| AppError(HysjError::InternalError("Invalid key data".into())))?;
        (priv_key, existing_keys.public_key.clone())
    } else {
        let (priv_key, pub_key) = hysj_vpn::keys::generate_keypair();
        // Encrypt private key before storing
        let encrypted = hysj_crypto::cipher::encrypt(
            priv_key.as_bytes(),
            &enc_key,
            auth.user_id.as_bytes(),
        )
        .map_err(|e| AppError(HysjError::InternalError(format!("Key encryption failed: {}", e))))?;
        hysj_db::vpn::store_vpn_keys(
            &state.db,
            auth.user_id,
            &pub_key,
            &encrypted,
        )
        .await?;
        (priv_key, pub_key)
    };

    // Allocate IP from DB using the session count to avoid collisions
    let session_count = hysj_db::vpn::count_sessions(&state.db, req.server_id).await?;
    let ip_num = (session_count as u32).wrapping_add(2); // start at .0.2
    let octet3 = ((ip_num >> 8) & 0xFF) as u8;
    let octet4 = (ip_num & 0xFF).max(2) as u8;
    let assigned_ip = format!("10.0.{}.{}/32", octet3, octet4);

    // Create the session
    let session = hysj_db::vpn::create_session(
        &state.db,
        auth.user_id,
        server.id,
        &public_key,
        &assigned_ip,
    )
    .await?;

    // Build WireGuard config
    let wg_config = hysj_vpn::config::WireGuardConfig {
        interface_private_key: private_key,
        interface_address: assigned_ip.clone(),
        dns: "1.1.1.1".to_string(),
        peer_public_key: server.public_key.clone(),
        peer_endpoint: server.endpoint.clone(),
        allowed_ips: "0.0.0.0/0".to_string(),
    };

    Ok(Json(VpnConnectResponse {
        config: wg_config.to_json(),
        session_id: session.id,
        assigned_ip,
    }))
}

/// POST /api/vpn/disconnect — end active session
pub async fn disconnect(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let session = hysj_db::vpn::get_active_session(&state.db, auth.user_id)
        .await?
        .ok_or(AppError(HysjError::ValidationError(
            "No active VPN session".into(),
        )))?;

    hysj_db::vpn::end_session(&state.db, session.id).await?;

    Ok(Json(serde_json::json!({ "disconnected": true })))
}

/// GET /api/vpn/status — return current VPN status
pub async fn status(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<VpnStatusResponse>, AppError> {
    let session = hysj_db::vpn::get_active_session(&state.db, auth.user_id).await?;

    match session {
        Some(s) => {
            // Look up the server info
            let servers = hysj_db::vpn::list_servers(&state.db).await?;
            let server_dto = servers.iter().find(|srv| srv.id == s.server_id).map(|srv| {
                VpnServerDto {
                    id: srv.id,
                    name: srv.name.clone(),
                    country: srv.country.clone(),
                    city: srv.city.clone(),
                }
            });

            Ok(Json(VpnStatusResponse {
                connected: true,
                session_id: Some(s.id),
                server: server_dto,
                bytes_up: s.bytes_up,
                bytes_down: s.bytes_down,
                connected_since: Some(s.started_at),
            }))
        }
        None => Ok(Json(VpnStatusResponse {
            connected: false,
            session_id: None,
            server: None,
            bytes_up: 0,
            bytes_down: 0,
            connected_since: None,
        })),
    }
}

/// GET /api/vpn/servers — list available servers
pub async fn list_servers(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Result<Json<Vec<VpnServerDto>>, AppError> {
    let servers = hysj_db::vpn::list_servers(&state.db).await?;

    let dtos: Vec<VpnServerDto> = servers
        .into_iter()
        .map(|s| VpnServerDto {
            id: s.id,
            name: s.name,
            country: s.country,
            city: s.city,
        })
        .collect();

    Ok(Json(dtos))
}
