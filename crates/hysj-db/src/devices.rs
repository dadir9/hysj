use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::Device;
use crate::DbError;

pub async fn register_device(
    pool: &PgPool,
    user_id: Uuid,
    device_name: &str,
    signed_pre_key: &[u8],
    signed_pre_key_sig: &[u8],
    kyber_public_key: &[u8],
) -> Result<Device, DbError> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let device = sqlx::query_as::<_, Device>(
        r#"
        INSERT INTO devices (id, user_id, device_name, signed_pre_key, signed_pre_key_sig,
                             kyber_public_key, is_online, last_active_at, registered_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, $7, $7)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(device_name)
    .bind(signed_pre_key)
    .bind(signed_pre_key_sig)
    .bind(kyber_public_key)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(device)
}

pub async fn find_by_id(pool: &PgPool, device_id: Uuid) -> Result<Device, DbError> {
    let device = sqlx::query_as::<_, Device>(
        "SELECT * FROM devices WHERE id = $1",
    )
    .bind(device_id)
    .fetch_one(pool)
    .await?;

    Ok(device)
}

pub async fn list_by_user(pool: &PgPool, user_id: Uuid) -> Result<Vec<Device>, DbError> {
    let devices = sqlx::query_as::<_, Device>(
        "SELECT * FROM devices WHERE user_id = $1 ORDER BY registered_at ASC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(devices)
}

pub async fn delete_device(pool: &PgPool, device_id: Uuid, user_id: Uuid) -> Result<bool, DbError> {
    let result = sqlx::query(
        "DELETE FROM devices WHERE id = $1 AND user_id = $2",
    )
    .bind(device_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn set_online(pool: &PgPool, device_id: Uuid, online: bool) -> Result<(), DbError> {
    sqlx::query("UPDATE devices SET is_online = $1, last_active_at = $2 WHERE id = $3")
        .bind(online)
        .bind(Utc::now())
        .bind(device_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Update a device's push notification token.
pub async fn update_push_token(
    pool: &PgPool,
    device_id: Uuid,
    push_token: &str,
) -> Result<(), DbError> {
    sqlx::query("UPDATE devices SET push_token = $1 WHERE id = $2")
        .bind(push_token)
        .bind(device_id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn list_by_users(pool: &PgPool, user_ids: &[Uuid]) -> Result<Vec<Device>, DbError> {
    let devices = sqlx::query_as::<_, Device>(
        "SELECT * FROM devices WHERE user_id = ANY($1) ORDER BY registered_at ASC",
    )
    .bind(user_ids)
    .fetch_all(pool)
    .await?;

    Ok(devices)
}

pub async fn find_one_device_for_user(pool: &PgPool, user_id: Uuid) -> Result<Device, DbError> {
    let device = sqlx::query_as::<_, Device>(
        "SELECT * FROM devices WHERE user_id = $1 ORDER BY last_active_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(device)
}
