use sqlx::PgPool;
use uuid::Uuid;

use crate::models::ContactRequest;
use crate::DbError;

pub async fn send_request(
    pool: &PgPool,
    from_user_id: Uuid,
    to_user_id: Uuid,
) -> Result<ContactRequest, DbError> {
    let req = sqlx::query_as::<_, ContactRequest>(
        r#"
        INSERT INTO contact_requests (from_user_id, to_user_id)
        VALUES ($1, $2)
        RETURNING *
        "#,
    )
    .bind(from_user_id)
    .bind(to_user_id)
    .fetch_one(pool)
    .await?;

    Ok(req)
}

pub async fn get_pending(pool: &PgPool, user_id: Uuid) -> Result<Vec<ContactRequest>, DbError> {
    let reqs = sqlx::query_as::<_, ContactRequest>(
        "SELECT * FROM contact_requests WHERE to_user_id = $1 ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(reqs)
}

pub async fn get_pending_paginated(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<ContactRequest>, DbError> {
    let reqs = sqlx::query_as::<_, ContactRequest>(
        "SELECT * FROM contact_requests WHERE to_user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(reqs)
}

pub async fn get_sent(pool: &PgPool, user_id: Uuid) -> Result<Vec<ContactRequest>, DbError> {
    let reqs = sqlx::query_as::<_, ContactRequest>(
        "SELECT * FROM contact_requests WHERE from_user_id = $1 ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(reqs)
}

pub async fn accept(pool: &PgPool, request_id: Uuid, user_id: Uuid) -> Result<ContactRequest, DbError> {
    let req = sqlx::query_as::<_, ContactRequest>(
        "DELETE FROM contact_requests WHERE id = $1 AND to_user_id = $2 RETURNING *",
    )
    .bind(request_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(req)
}

pub async fn reject(pool: &PgPool, request_id: Uuid, user_id: Uuid) -> Result<(), DbError> {
    let result = sqlx::query(
        "DELETE FROM contact_requests WHERE id = $1 AND to_user_id = $2",
    )
    .bind(request_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}
