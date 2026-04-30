use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{Group, GroupMember};
use crate::DbError;

pub async fn create_group(
    pool: &PgPool,
    name: &str,
    creator_id: Uuid,
    is_anonymous: bool,
) -> Result<Group, DbError> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let group = sqlx::query_as::<_, Group>(
        r#"
        INSERT INTO groups (id, name, creator_id, is_anonymous, max_members, created_at)
        VALUES ($1, $2, $3, $4, 50, $5)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(creator_id)
    .bind(is_anonymous)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(group)
}

pub async fn add_member(
    pool: &PgPool,
    group_id: Uuid,
    user_id: Uuid,
    role: &str,
) -> Result<GroupMember, DbError> {
    let now = Utc::now();

    let member = sqlx::query_as::<_, GroupMember>(
        r#"
        INSERT INTO group_members (group_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
    )
    .bind(group_id)
    .bind(user_id)
    .bind(role)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(member)
}

pub async fn remove_member(
    pool: &PgPool,
    group_id: Uuid,
    user_id: Uuid,
) -> Result<bool, DbError> {
    let result = sqlx::query(
        "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
    )
    .bind(group_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn find_by_id(pool: &PgPool, group_id: Uuid) -> Result<Group, DbError> {
    let group = sqlx::query_as::<_, Group>(
        "SELECT * FROM groups WHERE id = $1",
    )
    .bind(group_id)
    .fetch_one(pool)
    .await?;

    Ok(group)
}

pub async fn list_groups_for_user(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<Group>, DbError> {
    let groups = sqlx::query_as::<_, Group>(
        r#"
        SELECT g.* FROM groups g
        INNER JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = $1
        ORDER BY g.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(groups)
}

pub async fn list_groups_for_user_paginated(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<Group>, DbError> {
    let groups = sqlx::query_as::<_, Group>(
        r#"
        SELECT g.* FROM groups g
        INNER JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = $1
        ORDER BY g.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(groups)
}

pub async fn get_members(
    pool: &PgPool,
    group_id: Uuid,
) -> Result<Vec<GroupMember>, DbError> {
    let members = sqlx::query_as::<_, GroupMember>(
        "SELECT * FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC",
    )
    .bind(group_id)
    .fetch_all(pool)
    .await?;

    Ok(members)
}

/// Get a member's role in a group (e.g. "admin", "member").
/// Returns None if the user is not a member.
pub async fn get_member_role(
    pool: &PgPool,
    group_id: Uuid,
    user_id: Uuid,
) -> Result<Option<String>, DbError> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
    )
    .bind(group_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| r.0))
}

/// Delete a group and all its members (CASCADE).
pub async fn delete_group(pool: &PgPool, group_id: Uuid) -> Result<bool, DbError> {
    // Delete members first (in case no CASCADE on this table)
    sqlx::query("DELETE FROM group_members WHERE group_id = $1")
        .bind(group_id)
        .execute(pool)
        .await?;

    let result = sqlx::query("DELETE FROM groups WHERE id = $1")
        .bind(group_id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected() > 0)
}

/// Update the name of a group.
pub async fn update_group_name(
    pool: &PgPool,
    group_id: Uuid,
    name: &str,
) -> Result<(), DbError> {
    let result = sqlx::query("UPDATE groups SET name = $2 WHERE id = $1")
        .bind(group_id)
        .bind(name)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

pub async fn is_member(
    pool: &PgPool,
    group_id: Uuid,
    user_id: Uuid,
) -> Result<bool, DbError> {
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND user_id = $2",
    )
    .bind(group_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(row.0 > 0)
}
