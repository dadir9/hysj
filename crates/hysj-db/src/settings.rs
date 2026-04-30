use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{MutedChat, UserSettings};
use crate::DbError;

pub async fn get_or_create(pool: &PgPool, user_id: Uuid) -> Result<UserSettings, DbError> {
    let settings = sqlx::query_as::<_, UserSettings>(
        r#"
        INSERT INTO user_settings (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING;
        SELECT * FROM user_settings WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(settings)
}

pub async fn update(
    pool: &PgPool,
    user_id: Uuid,
    read_receipts: Option<bool>,
    typing_indicators: Option<bool>,
    last_active_visible: Option<bool>,
) -> Result<UserSettings, DbError> {
    // Ensure row exists
    sqlx::query(
        "INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    if let Some(v) = read_receipts {
        sqlx::query("UPDATE user_settings SET read_receipts_enabled = $2 WHERE user_id = $1")
            .bind(user_id)
            .bind(v)
            .execute(pool)
            .await?;
    }
    if let Some(v) = typing_indicators {
        sqlx::query(
            "UPDATE user_settings SET typing_indicators_enabled = $2 WHERE user_id = $1",
        )
        .bind(user_id)
        .bind(v)
        .execute(pool)
        .await?;
    }
    if let Some(v) = last_active_visible {
        sqlx::query("UPDATE user_settings SET last_active_visible = $2 WHERE user_id = $1")
            .bind(user_id)
            .bind(v)
            .execute(pool)
            .await?;
    }

    let settings = sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM user_settings WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(settings)
}

pub async fn mute_chat(pool: &PgPool, user_id: Uuid, target_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO muted_chats (user_id, target_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, target_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(target_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn unmute_chat(pool: &PgPool, user_id: Uuid, target_id: Uuid) -> Result<(), DbError> {
    sqlx::query("DELETE FROM muted_chats WHERE user_id = $1 AND target_id = $2")
        .bind(user_id)
        .bind(target_id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn get_muted_chats(pool: &PgPool, user_id: Uuid) -> Result<Vec<MutedChat>, DbError> {
    let muted = sqlx::query_as::<_, MutedChat>(
        "SELECT * FROM muted_chats WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(muted)
}

pub async fn get_muted_chats_paginated(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<MutedChat>, DbError> {
    let muted = sqlx::query_as::<_, MutedChat>(
        "SELECT * FROM muted_chats WHERE user_id = $1 LIMIT $2 OFFSET $3",
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(muted)
}
