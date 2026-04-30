use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{Emoji, EmojiPack};
use crate::DbError;

/// Create a new emoji pack.
pub async fn create_pack(
    pool: &PgPool,
    name: &str,
    description: Option<&str>,
    creator_id: Option<Uuid>,
    is_premium: bool,
    price_cents: Option<i32>,
) -> Result<EmojiPack, DbError> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let pack = sqlx::query_as::<_, EmojiPack>(
        r#"
        INSERT INTO emoji_packs (id, name, description, creator_id, is_premium, price_cents, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(description)
    .bind(creator_id)
    .bind(is_premium)
    .bind(price_cents)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(pack)
}

/// List all active emoji packs.
pub async fn list_packs(pool: &PgPool) -> Result<Vec<EmojiPack>, DbError> {
    let packs = sqlx::query_as::<_, EmojiPack>(
        "SELECT * FROM emoji_packs WHERE is_active = true ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await?;

    Ok(packs)
}

/// Get a single emoji pack by ID.
pub async fn get_pack(pool: &PgPool, pack_id: Uuid) -> Result<Option<EmojiPack>, DbError> {
    let pack = sqlx::query_as::<_, EmojiPack>(
        "SELECT * FROM emoji_packs WHERE id = $1",
    )
    .bind(pack_id)
    .fetch_optional(pool)
    .await?;

    Ok(pack)
}

/// Get all emojis in a pack.
pub async fn get_pack_emojis(pool: &PgPool, pack_id: Uuid) -> Result<Vec<Emoji>, DbError> {
    let emojis = sqlx::query_as::<_, Emoji>(
        "SELECT * FROM emojis WHERE pack_id = $1 ORDER BY shortcode",
    )
    .bind(pack_id)
    .fetch_all(pool)
    .await?;

    Ok(emojis)
}

/// Add an emoji to a pack.
pub async fn add_emoji(
    pool: &PgPool,
    pack_id: Uuid,
    shortcode: &str,
    image_url: &str,
    is_animated: bool,
) -> Result<Emoji, DbError> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let emoji = sqlx::query_as::<_, Emoji>(
        r#"
        INSERT INTO emojis (id, pack_id, shortcode, image_url, is_animated, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(pack_id)
    .bind(shortcode)
    .bind(image_url)
    .bind(is_animated)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(emoji)
}

/// Record a user purchasing/activating an emoji pack.
pub async fn purchase_pack(pool: &PgPool, user_id: Uuid, pack_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO user_emoji_packs (user_id, pack_id, purchased_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, pack_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(pack_id)
    .bind(Utc::now())
    .execute(pool)
    .await?;

    Ok(())
}

/// Get all emoji packs a user has purchased.
pub async fn get_user_packs(pool: &PgPool, user_id: Uuid) -> Result<Vec<EmojiPack>, DbError> {
    let packs = sqlx::query_as::<_, EmojiPack>(
        r#"
        SELECT ep.* FROM emoji_packs ep
        INNER JOIN user_emoji_packs uep ON uep.pack_id = ep.id
        WHERE uep.user_id = $1
        ORDER BY uep.purchased_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(packs)
}

/// Check if a user owns a specific emoji pack.
pub async fn has_pack(pool: &PgPool, user_id: Uuid, pack_id: Uuid) -> Result<bool, DbError> {
    let row = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM user_emoji_packs WHERE user_id = $1 AND pack_id = $2",
    )
    .bind(user_id)
    .bind(pack_id)
    .fetch_one(pool)
    .await?;

    Ok(row > 0)
}
