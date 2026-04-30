use std::sync::Arc;
use std::time::Duration;

use hysj_shared::dto::messages::WsMessage;

use crate::state::AppState;
use crate::ws::connection_tracker;

/// Periodically check if any online devices have pending wipe commands
/// and deliver them.
pub fn run(state: Arc<AppState>) {
    tokio::spawn(async move {
        let interval = Duration::from_secs(5 * 60);
        let mut redis = state.redis.clone();

        loop {
            tokio::time::sleep(interval).await;

            // Scan for wipe keys instead of polling per-device
            let mut cursor: u64 = 0;
            loop {
                let (next_cursor, keys): (u64, Vec<String>) =
                    match redis::cmd("SCAN")
                        .arg(cursor)
                        .arg("MATCH")
                        .arg("wipe:*")
                        .arg("COUNT")
                        .arg(100)
                        .query_async(&mut redis)
                        .await
                    {
                        Ok(result) => result,
                        Err(e) => {
                            tracing::debug!(error = %e, "Wipe sweep: SCAN failed");
                            break;
                        }
                    };

                for key in &keys {
                    // Extract device_id from key "wipe:<device_id>:*"
                    let parts: Vec<&str> = key.split(':').collect();
                    if parts.len() < 2 {
                        continue;
                    }
                    let device_id = match uuid::Uuid::parse_str(parts[1]) {
                        Ok(id) => id,
                        Err(_) => continue,
                    };

                    // Only deliver to online devices
                    if !state.connections.contains_key(&device_id) {
                        continue;
                    }

                    let wipes =
                        match hysj_messaging::wipe::get_pending_wipes(&mut redis, device_id).await
                        {
                            Ok(w) => w,
                            Err(_) => continue,
                        };

                    for wipe in wipes {
                        let msg = WsMessage::WipeCommand(wipe.command);
                        let _ = connection_tracker::send_to_device(
                            &state.connections,
                            device_id,
                            &msg,
                        );
                    }
                }

                cursor = next_cursor;
                if cursor == 0 {
                    break;
                }
            }
        }
    });
}
