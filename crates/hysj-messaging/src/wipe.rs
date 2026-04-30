use chrono::Utc;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use hysj_shared::constants::WIPE_TTL_SECONDS;
use hysj_shared::dto::wipe::WipeRequest;

use crate::MessagingError;

/// A pending wipe command stored in Redis, waiting for a device to acknowledge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingWipe {
    pub wipe_id: String,
    pub command: WipeRequest,
    pub issued_at: chrono::DateTime<chrono::Utc>,
}

/// Issue a wipe command to one or more target devices.
///
/// For each target device, stores a serialized `PendingWipe` at key
/// `wipe:{device_id}:{wipe_id}` with a 30-day TTL.
///
/// Returns the generated wipe_id.
pub async fn issue_wipe(
    conn: &mut impl AsyncCommands,
    target_device_ids: &[Uuid],
    wipe_command: &WipeRequest,
) -> Result<String, MessagingError> {
    let wipe_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let pending = PendingWipe {
        wipe_id: wipe_id.clone(),
        command: wipe_command.clone(),
        issued_at: now,
    };

    let serialized = serde_json::to_vec(&pending)
        .map_err(|e| MessagingError::SerializationError(e.to_string()))?;

    for device_id in target_device_ids {
        let key = format!("wipe:{}:{}", device_id, wipe_id);
        redis::cmd("SET")
            .arg(&key)
            .arg(&serialized)
            .arg("EX")
            .arg(WIPE_TTL_SECONDS)
            .exec_async(conn)
            .await?;

        tracing::info!(
            device_id = %device_id,
            wipe_id = %wipe_id,
            "Issued wipe command"
        );
    }

    Ok(wipe_id)
}

/// Get all pending wipe commands for a given device.
///
/// Uses SCAN instead of KEYS to avoid blocking Redis under load.
pub async fn get_pending_wipes(
    conn: &mut impl AsyncCommands,
    device_id: Uuid,
) -> Result<Vec<PendingWipe>, MessagingError> {
    let pattern = format!("wipe:{}:*", device_id);
    let mut wipes = Vec::new();
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
            let data: Option<Vec<u8>> = conn.get(key).await?;
            if let Some(bytes) = data {
                match serde_json::from_slice::<PendingWipe>(&bytes) {
                    Ok(wipe) => wipes.push(wipe),
                    Err(e) => {
                        tracing::warn!(key = %key, error = %e, "Failed to deserialize wipe command, skipping");
                    }
                }
            }
        }

        cursor = next_cursor;
        if cursor == 0 {
            break;
        }
    }

    Ok(wipes)
}

/// Confirm (acknowledge) a wipe for a device, removing it from Redis.
///
/// Returns true if the key existed and was deleted.
pub async fn confirm_wipe(
    conn: &mut impl AsyncCommands,
    device_id: Uuid,
    wipe_id: &str,
) -> Result<bool, MessagingError> {
    let key = format!("wipe:{}:{}", device_id, wipe_id);
    let deleted: u64 = conn.del(&key).await?;

    if deleted > 0 {
        tracing::info!(
            device_id = %device_id,
            wipe_id = %wipe_id,
            "Wipe confirmed and removed"
        );
    }

    Ok(deleted > 0)
}
