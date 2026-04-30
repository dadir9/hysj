use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{PreKey, PreKeyBundleData};
use crate::DbError;

pub async fn store_pre_keys(
    pool: &PgPool,
    device_id: Uuid,
    public_keys: &[Vec<u8>],
) -> Result<u64, DbError> {
    let mut count = 0u64;
    for key in public_keys {
        sqlx::query(
            r#"
            INSERT INTO pre_keys (device_id, public_key, is_used, created_at)
            VALUES ($1, $2, false, NOW())
            "#,
        )
        .bind(device_id)
        .bind(key)
        .execute(pool)
        .await?;
        count += 1;
    }
    Ok(count)
}

pub async fn claim_one_time_pre_key(
    pool: &PgPool,
    device_id: Uuid,
) -> Result<Option<PreKey>, DbError> {
    // Atomically claim the oldest unused pre-key
    let key = sqlx::query_as::<_, PreKey>(
        r#"
        UPDATE pre_keys
        SET is_used = true
        WHERE id = (
            SELECT id FROM pre_keys
            WHERE device_id = $1 AND is_used = false
            ORDER BY id ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
        "#,
    )
    .bind(device_id)
    .fetch_optional(pool)
    .await?;

    Ok(key)
}

pub async fn count_available_pre_keys(
    pool: &PgPool,
    device_id: Uuid,
) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM pre_keys WHERE device_id = $1 AND is_used = false",
    )
    .bind(device_id)
    .fetch_one(pool)
    .await?;

    Ok(row.0)
}

pub async fn get_pre_key_bundle(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<PreKeyBundleData, DbError> {
    // Get the user's identity keys
    let user_row: (Vec<u8>, Vec<u8>) = sqlx::query_as(
        "SELECT identity_public_key, identity_dh_public_key FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    // Get the most recently active device
    let device = sqlx::query_as::<_, crate::models::Device>(
        "SELECT * FROM devices WHERE user_id = $1 ORDER BY last_active_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    // Try to claim a one-time pre-key
    let otpk = claim_one_time_pre_key(pool, device.id).await?;

    Ok(PreKeyBundleData {
        identity_public_key: user_row.0,
        identity_dh_public_key: user_row.1,
        device_id: device.id,
        signed_pre_key: device.signed_pre_key,
        signed_pre_key_sig: device.signed_pre_key_sig,
        one_time_pre_key: otpk.map(|k| k.public_key),
        kyber_public_key: device.kyber_public_key,
    })
}
