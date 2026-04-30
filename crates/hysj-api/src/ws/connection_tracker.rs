use dashmap::DashMap;
use uuid::Uuid;

use hysj_shared::dto::messages::WsMessage;

use crate::state::WsSender;

/// Send a message to a specific device if it is online.
///
/// Returns Ok(()) if the message was sent, Err(()) if the device is offline
/// or the channel is closed.
pub fn send_to_device(
    connections: &DashMap<Uuid, WsSender>,
    device_id: Uuid,
    message: &WsMessage,
) -> Result<(), ()> {
    if let Some(sender) = connections.get(&device_id) {
        let json = serde_json::to_string(message).map_err(|_| ())?;
        sender
            .send(axum::extract::ws::Message::Text(json.into()))
            .map_err(|_| {
                // Channel closed; remove stale connection
                drop(sender);
                connections.remove(&device_id);
            })
    } else {
        Err(())
    }
}

/// Send a message to all online devices belonging to a user.
pub async fn send_to_user_devices(
    connections: &DashMap<Uuid, WsSender>,
    db: &sqlx::PgPool,
    user_id: Uuid,
    message: &WsMessage,
) {
    let devices = match hysj_db::devices::list_by_user(db, user_id).await {
        Ok(d) => d,
        Err(e) => {
            tracing::warn!(user_id = %user_id, error = %e, "Failed to list devices for user");
            return;
        }
    };

    for device in devices {
        let _ = send_to_device(connections, device.id, message);
    }
}
