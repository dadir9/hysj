pub mod message_expiry;
pub mod rate_limit_cleanup;
pub mod wipe_pending;

use std::sync::Arc;
use crate::state::AppState;

pub fn spawn_all(state: Arc<AppState>) {
    message_expiry::run(state.clone());
    wipe_pending::run(state.clone());
    rate_limit_cleanup::run(state);
}
