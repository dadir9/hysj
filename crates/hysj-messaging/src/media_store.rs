use redis::AsyncCommands;
use uuid::Uuid;

use crate::MessagingError;

/// Ephemeral media store backed by Redis.
/// Encrypted audio/file blobs are stored with a TTL and deleted after retrieval.
/// No disk persistence — same zero-storage principle as messages.
///
/// Store an encrypted media blob in Redis with TTL.
///
/// Redis key: `media:{media_id}`
/// Metadata key: `media:{media_id}:meta`
pub async fn store_blob(
    conn: &mut impl AsyncCommands,
    media_id: &str,
    encrypted_blob: &[u8],
    ttl_seconds: u64,
) -> Result<(), MessagingError> {
    let key = format!("media:{}", media_id);

    redis::cmd("SET")
        .arg(&key)
        .arg(encrypted_blob)
        .arg("EX")
        .arg(ttl_seconds)
        .exec_async(conn)
        .await?;

    tracing::debug!(
        media_id = %media_id,
        size = encrypted_blob.len(),
        ttl = ttl_seconds,
        "Stored media blob"
    );

    Ok(())
}

/// Store metadata for a media blob (duration, size, recipient).
pub async fn store_meta(
    conn: &mut impl AsyncCommands,
    media_id: &str,
    recipient_device_id: Uuid,
    duration_seconds: u32,
    blob_size: u64,
    ttl_seconds: u64,
) -> Result<(), MessagingError> {
    let key = format!("media:{}:meta", media_id);
    let meta = serde_json::json!({
        "recipient_device_id": recipient_device_id.to_string(),
        "duration_seconds": duration_seconds,
        "blob_size": blob_size,
    });

    redis::cmd("SET")
        .arg(&key)
        .arg(meta.to_string())
        .arg("EX")
        .arg(ttl_seconds)
        .exec_async(conn)
        .await?;

    Ok(())
}

/// Retrieve an encrypted media blob and set a short TTL for auto-delete.
/// After the recipient plays/sees the audio, it auto-deletes after `seen_ttl_seconds`.
/// Returns None if expired or not found.
pub async fn retrieve_and_expire(
    conn: &mut impl AsyncCommands,
    media_id: &str,
    seen_ttl_seconds: u64,
) -> Result<Option<Vec<u8>>, MessagingError> {
    let key = format!("media:{}", media_id);
    let meta_key = format!("media:{}:meta", media_id);

    let blob: Option<Vec<u8>> = conn.get(&key).await?;

    if blob.is_some() {
        // Set short TTL — blob auto-deletes after seen_ttl_seconds
        let _: () = redis::cmd("EXPIRE")
            .arg(&key)
            .arg(seen_ttl_seconds)
            .query_async(conn)
            .await?;
        let _: () = redis::cmd("EXPIRE")
            .arg(&meta_key)
            .arg(seen_ttl_seconds)
            .query_async(conn)
            .await?;

        tracing::debug!(
            media_id = %media_id,
            ttl = seen_ttl_seconds,
            "Audio seen — auto-delete in {} seconds",
            seen_ttl_seconds
        );
    }

    Ok(blob)
}

/// Retrieve media blob WITHOUT deleting (for peek/retry scenarios).
pub async fn retrieve(
    conn: &mut impl AsyncCommands,
    media_id: &str,
) -> Result<Option<Vec<u8>>, MessagingError> {
    let key = format!("media:{}", media_id);
    let blob: Option<Vec<u8>> = conn.get(&key).await?;
    Ok(blob)
}

/// Get metadata for a media blob.
pub async fn get_meta(
    conn: &mut impl AsyncCommands,
    media_id: &str,
) -> Result<Option<MediaMeta>, MessagingError> {
    let key = format!("media:{}:meta", media_id);
    let raw: Option<String> = conn.get(&key).await?;

    match raw {
        Some(json) => {
            let meta: MediaMeta = serde_json::from_str(&json)
                .map_err(|e| MessagingError::SerializationError(e.to_string()))?;
            Ok(Some(meta))
        }
        None => Ok(None),
    }
}

/// Delete a media blob (for wipe commands or sender cancel).
pub async fn delete_blob(
    conn: &mut impl AsyncCommands,
    media_id: &str,
) -> Result<bool, MessagingError> {
    let key = format!("media:{}", media_id);
    let meta_key = format!("media:{}:meta", media_id);
    let deleted: u64 = conn.del(&[&key, &meta_key]).await?;
    Ok(deleted > 0)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MediaMeta {
    pub recipient_device_id: String,
    pub duration_seconds: u32,
    pub blob_size: u64,
}
