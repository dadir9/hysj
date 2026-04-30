use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::User;
use crate::DbError;

/// Insert a new user and return the created row.
pub async fn create_user(
    pool: &PgPool,
    username: &str,
    phone_number: &str,
    password_hash: &str,
    salt: &[u8],
    identity_public_key: &[u8],
    identity_dh_public_key: &[u8],
) -> Result<User, DbError> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, username, phone_number, password_hash, salt,
                           identity_public_key, identity_dh_public_key,
                           has_2fa_enabled, created_at, last_seen_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $8)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(username)
    .bind(phone_number)
    .bind(password_hash)
    .bind(salt)
    .bind(identity_public_key)
    .bind(identity_dh_public_key)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(user)
}

/// Find a user by their UUID.
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, DbError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// Find a user by their username.
pub async fn find_by_username(pool: &PgPool, username: &str) -> Result<Option<User>, DbError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// Find a user by their phone number.
pub async fn find_by_phone_number(pool: &PgPool, phone_number: &str) -> Result<Option<User>, DbError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE phone_number = $1",
    )
    .bind(phone_number)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// Update the user's last_seen_at timestamp to now.
pub async fn update_last_seen(pool: &PgPool, user_id: Uuid) -> Result<(), DbError> {
    let result = sqlx::query("UPDATE users SET last_seen_at = $1 WHERE id = $2")
        .bind(Utc::now())
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Enable 2FA for a user by storing the encrypted TOTP secret.
pub async fn enable_2fa(
    pool: &PgPool,
    user_id: Uuid,
    totp_secret: &[u8],
) -> Result<(), DbError> {
    let result = sqlx::query(
        "UPDATE users SET totp_secret = $1, has_2fa_enabled = true WHERE id = $2",
    )
    .bind(totp_secret)
    .bind(user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Disable 2FA for a user, clearing their TOTP secret.
pub async fn disable_2fa(pool: &PgPool, user_id: Uuid) -> Result<(), DbError> {
    let result = sqlx::query(
        "UPDATE users SET totp_secret = NULL, has_2fa_enabled = false WHERE id = $1",
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Set (or update) the unique username for a user.
pub async fn set_username(pool: &PgPool, user_id: Uuid, username: &str) -> Result<(), DbError> {
    let result = sqlx::query("UPDATE users SET username = $2 WHERE id = $1")
        .bind(user_id)
        .bind(username)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Set the display name for a user.
pub async fn set_display_name(pool: &PgPool, user_id: Uuid, display_name: &str) -> Result<(), DbError> {
    let result = sqlx::query("UPDATE users SET display_name = $2 WHERE id = $1")
        .bind(user_id)
        .bind(display_name)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Delete a user account. CASCADE constraints handle related data.
pub async fn delete_user(pool: &PgPool, user_id: Uuid) -> Result<(), DbError> {
    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Set (or clear) the avatar URL for a user.
pub async fn set_avatar(pool: &PgPool, user_id: Uuid, avatar_url: Option<&str>) -> Result<(), DbError> {
    let result = sqlx::query("UPDATE users SET avatar_url = $2 WHERE id = $1")
        .bind(user_id)
        .bind(avatar_url)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Set the user's presence status (online, away, dnd).
pub async fn set_status(pool: &PgPool, user_id: Uuid, status: &str) -> Result<(), DbError> {
    let result = sqlx::query("UPDATE users SET status = $2 WHERE id = $1")
        .bind(user_id)
        .bind(status)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// Check if a username is available (not already taken).
pub async fn is_username_available(pool: &PgPool, username: &str) -> Result<bool, DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE username = $1")
        .bind(username)
        .fetch_one(pool)
        .await?;

    Ok(row.0 == 0)
}
