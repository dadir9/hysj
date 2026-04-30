use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket};
use axum::extract::{Query, State, WebSocketUpgrade};
use axum::response::IntoResponse;
use futures::stream::StreamExt;
use tokio::sync::mpsc;
use uuid::Uuid;

use hysj_shared::constants::MESSAGE_TTL_SECONDS;
use hysj_shared::dto::messages::*;
use hysj_shared::error::HysjError;

use crate::error::AppError;
use crate::state::AppState;
use crate::ws::connection_tracker;

/// GET /ws?token=JWT
///
/// Upgrade an HTTP connection to a WebSocket.
pub async fn ws_upgrade(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
    ws: WebSocketUpgrade,
) -> Result<impl IntoResponse, AppError> {
    let token = params
        .get("token")
        .ok_or_else(|| AppError(HysjError::AuthFailed("Missing token query parameter".into())))?;

    let claims = hysj_auth::jwt::validate_token(token, &state.config.jwt_secret)?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError(HysjError::InvalidToken))?;
    let device_id =
        Uuid::parse_str(&claims.device_id).map_err(|_| AppError(HysjError::InvalidToken))?;
    let username = claims.username.clone();

    Ok(ws.on_upgrade(move |socket| handle_socket(socket, state, user_id, device_id, username)))
}

async fn handle_socket(
    socket: WebSocket,
    state: Arc<AppState>,
    user_id: Uuid,
    device_id: Uuid,
    _username: String,
) {
    let (ws_sink, mut ws_stream) = socket.split();

    // Create an mpsc channel for sending messages through this WebSocket
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Register connection
    state.connections.insert(device_id, tx);

    // Mark device online
    if let Err(e) = hysj_db::devices::set_online(&state.db, device_id, true).await {
        tracing::warn!(device_id = %device_id, error = %e, "Failed to set device online");
    }

    tracing::info!(user_id = %user_id, device_id = %device_id, "WebSocket connected");

    // Deliver pending messages from Redis
    deliver_pending_messages(&state, device_id).await;
    deliver_pending_wipes(&state, device_id).await;

    // Track whether we've received a pong recently
    let pong_received = Arc::new(AtomicBool::new(true));
    let pong_received_clone = pong_received.clone();

    // Forward channel messages to WebSocket sink + send periodic pings
    let sink_task = tokio::spawn(async move {
        use futures::SinkExt;
        let mut ws_sink = ws_sink;
        let mut ping_interval = tokio::time::interval(Duration::from_secs(30));
        // Skip the first immediate tick
        ping_interval.tick().await;

        loop {
            tokio::select! {
                msg = rx.recv() => {
                    match msg {
                        Some(msg) => {
                            if ws_sink.send(msg).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    }
                }
                _ = ping_interval.tick() => {
                    // Check if previous pong was received
                    if !pong_received_clone.load(Ordering::Relaxed) {
                        tracing::debug!("No pong received within timeout, closing connection");
                        let _ = ws_sink.close().await;
                        break;
                    }
                    pong_received_clone.store(false, Ordering::Relaxed);
                    if ws_sink.send(Message::Ping(vec![].into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    // Process incoming messages
    while let Some(result) = ws_stream.next().await {
        let msg = match result {
            Ok(Message::Text(text)) => text,
            Ok(Message::Pong(_)) => {
                pong_received.store(true, Ordering::Relaxed);
                continue;
            }
            Ok(Message::Close(_)) => break,
            Ok(_) => continue,
            Err(e) => {
                tracing::debug!(error = %e, "WebSocket receive error");
                break;
            }
        };

        let ws_msg: WsMessage = match serde_json::from_str(&msg) {
            Ok(m) => m,
            Err(e) => {
                let err = WsMessage::Error {
                    message: format!("Invalid message format: {}", e),
                };
                send_to_self(&state, device_id, &err);
                continue;
            }
        };

        if let Err(e) = handle_ws_message(&state, user_id, device_id, ws_msg).await {
            let err = WsMessage::Error {
                message: e.to_string(),
            };
            send_to_self(&state, device_id, &err);
        }
    }

    // Cleanup
    state.connections.remove(&device_id);
    sink_task.abort();

    if let Err(e) = hysj_db::devices::set_online(&state.db, device_id, false).await {
        tracing::warn!(device_id = %device_id, error = %e, "Failed to set device offline");
    }

    tracing::info!(user_id = %user_id, device_id = %device_id, "WebSocket disconnected");
}

async fn handle_ws_message(
    state: &AppState,
    user_id: Uuid,
    sender_device_id: Uuid,
    msg: WsMessage,
) -> Result<(), String> {
    match msg {
        WsMessage::SendMessage(envelope) => {
            let recipient_device_id = envelope.recipient_device_id;
            let message_id = envelope.message_id.clone();
            let ttl = envelope
                .ttl_seconds
                .map(|t| t as u64)
                .unwrap_or(MESSAGE_TTL_SECONDS);

            let delivered = connection_tracker::send_to_device(
                &state.connections,
                recipient_device_id,
                &WsMessage::SendMessage(envelope.clone()),
            );

            if delivered.is_err() {
                let blob = serde_json::to_vec(&envelope).map_err(|e| e.to_string())?;
                let mut redis = state.redis.clone();
                hysj_messaging::queue::enqueue(
                    &mut redis,
                    recipient_device_id,
                    &message_id,
                    &blob,
                    ttl,
                )
                .await
                .map_err(|e| e.to_string())?;
            }

            Ok(())
        }

        WsMessage::SendGroupMessage { group_id, envelope } => {
            let members = hysj_db::groups::get_members(&state.db, group_id)
                .await
                .map_err(|e| e.to_string())?;

            let ttl = envelope
                .ttl_seconds
                .map(|t| t as u64)
                .unwrap_or(MESSAGE_TTL_SECONDS);

            // Batch: fetch all devices for all members in one query
            let member_ids: Vec<Uuid> = members
                .iter()
                .filter(|m| m.user_id != user_id)
                .map(|m| m.user_id)
                .collect();

            let devices = hysj_db::devices::list_by_users(&state.db, &member_ids)
                .await
                .unwrap_or_default();

            // Serialize once, reuse for offline queuing
            let blob = serde_json::to_vec(&envelope).map_err(|e| e.to_string())?;
            let mut redis = state.redis.clone();

            for device in devices {
                let msg = WsMessage::SendGroupMessage {
                    group_id,
                    envelope: envelope.clone(),
                };

                let delivered =
                    connection_tracker::send_to_device(&state.connections, device.id, &msg);

                if delivered.is_err() {
                    let _ = hysj_messaging::queue::enqueue(
                        &mut redis,
                        device.id,
                        &envelope.message_id,
                        &blob,
                        ttl,
                    )
                    .await;
                }
            }

            Ok(())
        }

        WsMessage::Delivered(ack) => {
            let mut redis = state.redis.clone();
            hysj_messaging::queue::delete_message(&mut redis, ack.device_id, &ack.message_id)
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        }

        WsMessage::Typing(indicator) => {
            connection_tracker::send_to_user_devices(
                &state.connections,
                &state.db,
                indicator.recipient_id,
                &WsMessage::Typing(indicator),
            )
            .await;
            Ok(())
        }

        WsMessage::Read(receipt) => {
            connection_tracker::send_to_user_devices(
                &state.connections,
                &state.db,
                receipt.sender_id,
                &WsMessage::Read(receipt),
            )
            .await;
            Ok(())
        }

        WsMessage::WipeCommand(wipe_req) => {
            let target_devices: Vec<Uuid> = match &wipe_req.wipe_type {
                hysj_shared::dto::wipe::WipeType::All => {
                    let devices = hysj_db::devices::list_by_user(&state.db, user_id)
                        .await
                        .unwrap_or_default();
                    devices.into_iter().map(|d| d.id).collect()
                }
                hysj_shared::dto::wipe::WipeType::Device => {
                    wipe_req
                        .target_device_id
                        .map(|id| vec![id])
                        .unwrap_or_default()
                }
                hysj_shared::dto::wipe::WipeType::Conversation => {
                    let mut ids = Vec::new();
                    if let Some(partner_id) = wipe_req.conversation_partner_id {
                        let devices = hysj_db::devices::list_by_user(&state.db, partner_id)
                            .await
                            .unwrap_or_default();
                        ids.extend(devices.into_iter().map(|d| d.id));
                    }
                    let own = hysj_db::devices::list_by_user(&state.db, user_id)
                        .await
                        .unwrap_or_default();
                    ids.extend(own.into_iter().map(|d| d.id));
                    ids
                }
            };

            let mut redis = state.redis.clone();
            let wipe_id =
                hysj_messaging::wipe::issue_wipe(&mut redis, &target_devices, &wipe_req)
                    .await
                    .map_err(|e| e.to_string())?;

            let ws_msg = WsMessage::WipeCommand(wipe_req);
            for did in &target_devices {
                if *did != sender_device_id {
                    let _ =
                        connection_tracker::send_to_device(&state.connections, *did, &ws_msg);
                }
            }

            tracing::info!(wipe_id = %wipe_id, "Wipe command issued via WebSocket");
            Ok(())
        }

        WsMessage::WipeAck(ack) => {
            let mut redis = state.redis.clone();
            hysj_messaging::wipe::confirm_wipe(&mut redis, ack.device_id, &ack.wipe_id)
                .await
                .map_err(|e| e.to_string())?;

            tracing::info!(
                wipe_id = %ack.wipe_id,
                device_id = %ack.device_id,
                "Wipe acknowledged"
            );
            Ok(())
        }

        WsMessage::SaveInChat(save) => {
            // Notify the other party that a message was saved (Snapchat-style)
            connection_tracker::send_to_user_devices(
                &state.connections,
                &state.db,
                save.recipient_id,
                &WsMessage::SaveInChat(save),
            )
            .await;
            Ok(())
        }

        WsMessage::Reaction(reaction) => {
            connection_tracker::send_to_user_devices(
                &state.connections,
                &state.db,
                reaction.recipient_id,
                &WsMessage::Reaction(reaction),
            )
            .await;
            Ok(())
        }

        WsMessage::CallSignal(signal) => {
            connection_tracker::send_to_user_devices(
                &state.connections,
                &state.db,
                signal.peer_id,
                &WsMessage::CallSignal(signal),
            )
            .await;
            Ok(())
        }

        WsMessage::PinMessage(pin) => {
            // Verify sender is a group member
            let is_member = hysj_db::groups::is_member(&state.db, pin.group_id, user_id)
                .await
                .unwrap_or(false);

            if !is_member {
                return Err("Not a member of this group".into());
            }

            if pin.pin {
                hysj_db::pinned_messages::pin(&state.db, pin.group_id, &pin.message_id, user_id)
                    .await
                    .map_err(|e| e.to_string())?;
            } else {
                hysj_db::pinned_messages::unpin(&state.db, pin.group_id, &pin.message_id)
                    .await
                    .map_err(|e| e.to_string())?;
            }

            // Notify group members
            let members = hysj_db::groups::get_members(&state.db, pin.group_id)
                .await
                .unwrap_or_default();

            let member_ids: Vec<Uuid> = members
                .iter()
                .filter(|m| m.user_id != user_id)
                .map(|m| m.user_id)
                .collect();

            let devices = hysj_db::devices::list_by_users(&state.db, &member_ids)
                .await
                .unwrap_or_default();

            let msg = WsMessage::PinMessage(pin);
            for device in devices {
                let _ = connection_tracker::send_to_device(&state.connections, device.id, &msg);
            }

            Ok(())
        }

        WsMessage::Error { .. } => Ok(()),
    }
}

async fn deliver_pending_messages(state: &AppState, device_id: Uuid) {
    let mut redis = state.redis.clone();
    match hysj_messaging::queue::dequeue_all(&mut redis, device_id).await {
        Ok(messages) => {
            for queued in messages {
                match serde_json::from_slice::<EncryptedEnvelope>(&queued.encrypted_blob) {
                    Ok(envelope) => {
                        let msg = WsMessage::SendMessage(envelope);
                        let _ = connection_tracker::send_to_device(
                            &state.connections,
                            device_id,
                            &msg,
                        );
                    }
                    Err(_) => {
                        if let Some(sender) = state.connections.get(&device_id) {
                            let text = String::from_utf8_lossy(&queued.encrypted_blob);
                            let _ = sender.send(Message::Text(text.into_owned().into()));
                        }
                    }
                }
            }
        }
        Err(e) => {
            tracing::warn!(
                device_id = %device_id,
                error = %e,
                "Failed to dequeue pending messages"
            );
        }
    }
}

async fn deliver_pending_wipes(state: &AppState, device_id: Uuid) {
    let mut redis = state.redis.clone();
    match hysj_messaging::wipe::get_pending_wipes(&mut redis, device_id).await {
        Ok(wipes) => {
            for wipe in wipes {
                let msg = WsMessage::WipeCommand(wipe.command);
                let _ = connection_tracker::send_to_device(&state.connections, device_id, &msg);
            }
        }
        Err(e) => {
            tracing::warn!(
                device_id = %device_id,
                error = %e,
                "Failed to fetch pending wipes"
            );
        }
    }
}

fn send_to_self(state: &AppState, device_id: Uuid, msg: &WsMessage) {
    let _ = connection_tracker::send_to_device(&state.connections, device_id, msg);
}
