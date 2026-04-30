use redis::AsyncCommands;
use uuid::Uuid;

use crate::MessagingError;

/// A message waiting in the Redis queue for a device to pick up.
#[derive(Debug, Clone)]
pub struct QueuedMessage {
    pub message_id: String,
    pub encrypted_blob: Vec<u8>,
}

/// Enqueue an encrypted message for a recipient device.
///
/// Redis key: `msg:{recipient_device_id}:{message_id}`
/// The blob is stored with an expiry (TTL) in seconds.
pub async fn enqueue(
    conn: &mut impl AsyncCommands,
    recipient_device_id: Uuid,
    message_id: &str,
    encrypted_blob: &[u8],
    ttl_seconds: u64,
) -> Result<(), MessagingError> {
    let key = format!("msg:{}:{}", recipient_device_id, message_id);

    // Dedup: skip if message already queued
    let exists: bool = redis::cmd("EXISTS")
        .arg(&key)
        .query_async(conn)
        .await?;
    if exists {
        return Ok(());
    }

    redis::cmd("SET")
        .arg(&key)
        .arg(encrypted_blob)
        .arg("EX")
        .arg(ttl_seconds)
        .exec_async(conn)
        .await?;

    tracing::debug!(
        device_id = %recipient_device_id,
        message_id = %message_id,
        ttl = ttl_seconds,
        "Enqueued message"
    );

    Ok(())
}

/// Dequeue all pending messages for a device.
///
/// Uses SCAN to find all `msg:{device_id}:*` keys, GETs each value,
/// then DELetes each key. Returns the list of queued messages.
pub async fn dequeue_all(
    conn: &mut impl AsyncCommands,
    device_id: Uuid,
) -> Result<Vec<QueuedMessage>, MessagingError> {
    let pattern = format!("msg:{}:*", device_id);
    let prefix = format!("msg:{}:", device_id);
    let mut messages = Vec::new();

    // Use SCAN instead of KEYS to avoid blocking Redis
    let mut cursor: u64 = 0;
    loop {
        let (next_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
            .arg(cursor)
            .arg("MATCH")
            .arg(&pattern)
            .arg("COUNT")
            .arg(100)
            .query_async(conn)
            .await?;

        for key in &keys {
            let blob: Option<Vec<u8>> = conn.get(key).await?;
            if let Some(data) = blob {
                let _: () = conn.del(key).await?;

                let message_id = key
                    .strip_prefix(&prefix)
                    .unwrap_or(key)
                    .to_string();

                messages.push(QueuedMessage {
                    message_id,
                    encrypted_blob: data,
                });
            }
        }

        cursor = next_cursor;
        if cursor == 0 {
            break;
        }
    }

    if !messages.is_empty() {
        tracing::debug!(
            device_id = %device_id,
            count = messages.len(),
            "Dequeued all pending messages"
        );
    }

    Ok(messages)
}

/// Delete a single queued message for a device.
///
/// Returns true if the key existed and was deleted.
pub async fn delete_message(
    conn: &mut impl AsyncCommands,
    device_id: Uuid,
    message_id: &str,
) -> Result<bool, MessagingError> {
    let key = format!("msg:{}:{}", device_id, message_id);
    let deleted: u64 = conn.del(&key).await?;
    Ok(deleted > 0)
}

/// Count the number of pending messages for a device using SCAN.
pub async fn count_pending(
    conn: &mut impl AsyncCommands,
    device_id: Uuid,
) -> Result<u64, MessagingError> {
    let pattern = format!("msg:{}:*", device_id);
    let mut count: u64 = 0;
    let mut cursor: u64 = 0;

    loop {
        let (next_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
            .arg(cursor)
            .arg("MATCH")
            .arg(&pattern)
            .arg("COUNT")
            .arg(100)
            .query_async(conn)
            .await?;

        count += keys.len() as u64;
        cursor = next_cursor;
        if cursor == 0 {
            break;
        }
    }

    Ok(count)
}
