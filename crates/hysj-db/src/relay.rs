use sqlx::PgPool;

use crate::models::RelayNode;
use crate::DbError;

/// List all active relay nodes, ordered by load.
pub async fn list_active_nodes(pool: &PgPool) -> Result<Vec<RelayNode>, DbError> {
    let nodes = sqlx::query_as::<_, RelayNode>(
        "SELECT * FROM relay_nodes WHERE is_active = true ORDER BY load_percent ASC",
    )
    .fetch_all(pool)
    .await?;

    Ok(nodes)
}
