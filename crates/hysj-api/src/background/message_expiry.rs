use std::sync::Arc;
use std::time::Duration;

use crate::state::AppState;

/// Periodically scan Redis for expired message keys (safety sweep).
///
/// Redis TTL handles most expiry automatically, but this sweep catches
/// any edge cases and logs statistics.
pub fn run(state: Arc<AppState>) {
    tokio::spawn(async move {
        let interval =
            Duration::from_secs(hysj_shared::constants::EXPIRY_SWEEP_INTERVAL_SECONDS);

        loop {
            tokio::time::sleep(interval).await;

            let mut redis = state.redis.clone();

            // Use SCAN instead of KEYS to avoid blocking Redis
            let mut cursor: u64 = 0;
            let mut fixed = 0u64;
            let mut total = 0u64;

            loop {
                let (next_cursor, keys): (u64, Vec<String>) =
                    match redis::cmd("SCAN")
                        .arg(cursor)
                        .arg("MATCH")
                        .arg("msg:*")
                        .arg("COUNT")
                        .arg(100)
                        .query_async(&mut redis)
                        .await
                    {
                        Ok(result) => result,
                        Err(e) => {
                            tracing::warn!(error = %e, "Message expiry sweep: SCAN failed");
                            break;
                        }
                    };

                total += keys.len() as u64;

                for key in &keys {
                    let ttl: i64 = match redis::cmd("TTL")
                        .arg(key)
                        .query_async(&mut redis)
                        .await
                    {
                        Ok(t) => t,
                        Err(_) => continue,
                    };

                    if ttl == -1 {
                        let _: Result<(), _> = redis::cmd("EXPIRE")
                            .arg(key)
                            .arg(hysj_shared::constants::MESSAGE_TTL_SECONDS)
                            .query_async(&mut redis)
                            .await;
                        fixed += 1;
                    }
                }

                cursor = next_cursor;
                if cursor == 0 {
                    break;
                }
            }

            if total > 0 {
                tracing::debug!(
                    count = total,
                    "Message expiry sweep: found pending messages (TTL-managed)"
                );
            }

            if fixed > 0 {
                tracing::warn!(
                    count = fixed,
                    "Message expiry sweep: set TTL on keys missing expiry"
                );
            }
        }
    });
}
