use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::Contact;
use crate::DbError;

/// Add a contact relationship.
pub async fn add_contact(
    pool: &PgPool,
    user_id: Uuid,
    contact_user_id: Uuid,
) -> Result<Contact, DbError> {
    let now = Utc::now();

    let contact = sqlx::query_as::<_, Contact>(
        r#"
        INSERT INTO contacts (user_id, contact_user_id, created_at)
        VALUES ($1, $2, $3)
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(contact_user_id)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(contact)
}

/// Set (or clear) a nickname for a contact.
pub async fn set_nickname(
    pool: &PgPool,
    user_id: Uuid,
    contact_user_id: Uuid,
    nickname: Option<&str>,
) -> Result<(), DbError> {
    let result = sqlx::query(
        "UPDATE contacts SET nickname = $3 WHERE user_id = $1 AND contact_user_id = $2",
    )
    .bind(user_id)
    .bind(contact_user_id)
    .bind(nickname)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Block a contact.
pub async fn block_contact(
    pool: &PgPool,
    user_id: Uuid,
    contact_user_id: Uuid,
) -> Result<(), DbError> {
    // Upsert: if contact exists update, otherwise insert with blocked=true
    sqlx::query(
        r#"
        INSERT INTO contacts (user_id, contact_user_id, is_blocked, created_at)
        VALUES ($1, $2, true, $3)
        ON CONFLICT (user_id, contact_user_id)
        DO UPDATE SET is_blocked = true
        "#,
    )
    .bind(user_id)
    .bind(contact_user_id)
    .bind(Utc::now())
    .execute(pool)
    .await?;

    Ok(())
}

/// Unblock a contact.
pub async fn unblock_contact(
    pool: &PgPool,
    user_id: Uuid,
    contact_user_id: Uuid,
) -> Result<(), DbError> {
    let result = sqlx::query(
        "UPDATE contacts SET is_blocked = false WHERE user_id = $1 AND contact_user_id = $2",
    )
    .bind(user_id)
    .bind(contact_user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Get all contacts for a user.
pub async fn get_contacts(pool: &PgPool, user_id: Uuid) -> Result<Vec<Contact>, DbError> {
    let contacts = sqlx::query_as::<_, Contact>(
        "SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(contacts)
}

/// Get contacts for a user with pagination.
pub async fn get_contacts_paginated(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<Contact>, DbError> {
    let contacts = sqlx::query_as::<_, Contact>(
        "SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at LIMIT $2 OFFSET $3",
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(contacts)
}

/// Get a single contact relationship.
pub async fn get_contact(
    pool: &PgPool,
    user_id: Uuid,
    contact_user_id: Uuid,
) -> Result<Option<Contact>, DbError> {
    let contact = sqlx::query_as::<_, Contact>(
        "SELECT * FROM contacts WHERE user_id = $1 AND contact_user_id = $2",
    )
    .bind(user_id)
    .bind(contact_user_id)
    .fetch_optional(pool)
    .await?;

    Ok(contact)
}

/// Remove a contact relationship.
pub async fn remove_contact(
    pool: &PgPool,
    user_id: Uuid,
    contact_user_id: Uuid,
) -> Result<(), DbError> {
    let result = sqlx::query(
        "DELETE FROM contacts WHERE user_id = $1 AND contact_user_id = $2",
    )
    .bind(user_id)
    .bind(contact_user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}
