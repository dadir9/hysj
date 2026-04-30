use sqlx::PgPool;
use uuid::Uuid;

use crate::models::PinnedMessage;
use crate::DbError;

pub async fn pin(
    pool: &PgPool,
    group_id: Uuid,
    message_id: &str,
    pinned_by: Uuid,
) -> Result<PinnedMessage, DbError> {
    let pinned = sqlx::query_as::<_, PinnedMessage>(
        r#"
        INSERT INTO pinned_messages (group_id, message_id, pinned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (group_id, message_id) DO NOTHING
        RETURNING *
        "#,
    )
    .bind(group_id)
    .bind(message_id)
    .bind(pinned_by)
    .fetch_one(pool)
    .await?;

    Ok(pinned)
}

pub async fn unpin(pool: &PgPool, group_id: Uuid, message_id: &str) -> Result<(), DbError> {
    sqlx::query("DELETE FROM pinned_messages WHERE group_id = $1 AND message_id = $2")
        .bind(group_id)
        .bind(message_id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn get_pinned(pool: &PgPool, group_id: Uuid) -> Result<Vec<PinnedMessage>, DbError> {
    let pins = sqlx::query_as::<_, PinnedMessage>(
        "SELECT * FROM pinned_messages WHERE group_id = $1 ORDER BY pinned_at DESC",
    )
    .bind(group_id)
    .fetch_all(pool)
    .await?;

    Ok(pins)
}
