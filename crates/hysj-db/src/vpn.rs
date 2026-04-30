use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{UserVpnKey, VpnServer, VpnSession};
use crate::DbError;

/// List all active VPN servers.
pub async fn list_servers(pool: &PgPool) -> Result<Vec<VpnServer>, DbError> {
    let servers = sqlx::query_as::<_, VpnServer>(
        "SELECT * FROM vpn_servers WHERE is_active = true ORDER BY country, city",
    )
    .fetch_all(pool)
    .await?;

    Ok(servers)
}

/// Create a new VPN session.
pub async fn create_session(
    pool: &PgPool,
    user_id: Uuid,
    server_id: Uuid,
    client_public_key: &str,
    assigned_ip: &str,
) -> Result<VpnSession, DbError> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let session = sqlx::query_as::<_, VpnSession>(
        r#"
        INSERT INTO vpn_sessions (id, user_id, server_id, client_public_key, assigned_ip, started_at, bytes_up, bytes_down)
        VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(server_id)
    .bind(client_public_key)
    .bind(assigned_ip)
    .bind(now)
    .fetch_one(pool)
    .await?;

    // Increment server connection count
    sqlx::query("UPDATE vpn_servers SET current_connections = current_connections + 1 WHERE id = $1")
        .bind(server_id)
        .execute(pool)
        .await?;

    Ok(session)
}

/// End an active VPN session.
pub async fn end_session(pool: &PgPool, session_id: Uuid) -> Result<(), DbError> {
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE vpn_sessions SET ended_at = $2
        WHERE id = $1 AND ended_at IS NULL
        "#,
    )
    .bind(session_id)
    .bind(now)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    // Decrement server connection count
    sqlx::query(
        r#"
        UPDATE vpn_servers SET current_connections = GREATEST(current_connections - 1, 0)
        WHERE id = (SELECT server_id FROM vpn_sessions WHERE id = $1)
        "#,
    )
    .bind(session_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Get the user's currently active VPN session, if any.
pub async fn get_active_session(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<VpnSession>, DbError> {
    let session = sqlx::query_as::<_, VpnSession>(
        "SELECT * FROM vpn_sessions WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(session)
}

/// Store (or replace) VPN keys for a user.
pub async fn store_vpn_keys(
    pool: &PgPool,
    user_id: Uuid,
    public_key: &str,
    private_key_encrypted: &[u8],
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO user_vpn_keys (user_id, public_key, private_key_encrypted, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET public_key = $2, private_key_encrypted = $3, created_at = $4
        "#,
    )
    .bind(user_id)
    .bind(public_key)
    .bind(private_key_encrypted)
    .bind(Utc::now())
    .execute(pool)
    .await?;

    Ok(())
}

/// Count active sessions on a server (for IP allocation).
pub async fn count_sessions(pool: &PgPool, server_id: Uuid) -> Result<i64, DbError> {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM vpn_sessions WHERE server_id = $1 AND ended_at IS NULL",
    )
    .bind(server_id)
    .fetch_one(pool)
    .await?;

    Ok(count.0)
}

/// Get the stored VPN keys for a user.
pub async fn get_vpn_keys(pool: &PgPool, user_id: Uuid) -> Result<Option<UserVpnKey>, DbError> {
    let keys = sqlx::query_as::<_, UserVpnKey>(
        "SELECT * FROM user_vpn_keys WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(keys)
}
