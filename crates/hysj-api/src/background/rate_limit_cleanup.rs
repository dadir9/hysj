use std::sync::Arc;
use std::time::Duration;

use crate::state::AppState;

/// Periodically clean up stale entries in the in-memory rate limiter.
/// Runs every 10 minutes, removes entries older than 1 hour.
pub fn run(state: Arc<AppState>) {
    tokio::spawn(async move {
        let interval = Duration::from_secs(10 * 60);
        let max_age = Duration::from_secs(60 * 60);

        loop {
            tokio::time::sleep(interval).await;
            state.rate_limiter.cleanup(max_age);
            tracing::debug!("Rate limiter cleanup completed");
        }
    });
}
