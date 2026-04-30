use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::DbError;

pub async fn record_attempt(
    pool: &PgPool,
    ip_address: &str,
    user_id: Option<Uuid>,
    success: bool,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO login_attempts (ip_address, user_id, success, attempted_at)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(ip_address)
    .bind(user_id)
    .bind(success)
    .bind(Utc::now())
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn count_recent_failures(
    pool: &PgPool,
    ip_address: &str,
    window_seconds: u64,
) -> Result<i64, DbError> {
    let cutoff = Utc::now() - chrono::Duration::seconds(window_seconds as i64);

    let row: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*) FROM login_attempts
        WHERE ip_address = $1 AND success = false AND attempted_at > $2
        "#,
    )
    .bind(ip_address)
    .bind(cutoff)
    .fetch_one(pool)
    .await?;

    Ok(row.0)
}

pub async fn is_locked_out(
    pool: &PgPool,
    ip_address: &str,
    max_failures: u32,
    window_seconds: u64,
) -> Result<bool, DbError> {
    let count = count_recent_failures(pool, ip_address, window_seconds).await?;
    Ok(count >= max_failures as i64)
}
