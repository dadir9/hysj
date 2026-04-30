use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::wipe::{WipeAckDto, WipeRequest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedEnvelope {
    pub recipient_device_id: Uuid,
    pub message_id: String,
    /// Base64-encoded sealed blob
    pub sealed_blob: String,
    pub ttl_seconds: Option<u32>,
    pub self_destruct_seconds: Option<u32>,
    /// Reply-to: references another message (encrypted inside blob, this is for routing)
    pub reply_to_message_id: Option<String>,
    /// True if this message was forwarded from another conversation
    pub is_forwarded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryAck {
    pub device_id: Uuid,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingIndicator {
    pub recipient_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadReceipt {
    pub sender_id: Uuid,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reaction {
    pub recipient_id: Uuid,
    pub message_id: String,
    pub emoji: String,
    /// True to add reaction, false to remove
    pub add: bool,
}

/// WebRTC call signaling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallSignal {
    pub peer_id: Uuid,
    pub call_id: String,
    pub signal_type: CallSignalType,
    /// SDP offer/answer or ICE candidate as JSON string
    pub payload: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CallSignalType {
    Offer,
    Answer,
    IceCandidate,
    Hangup,
    Busy,
}

/// Notification that a message was saved in chat (like Snapchat).
/// The actual save is client-side; this just notifies the other party.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveInChat {
    pub recipient_id: Uuid,
    pub message_id: String,
    /// true = saved, false = unsaved
    pub saved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinMessage {
    pub group_id: Uuid,
    pub message_id: String,
    /// True to pin, false to unpin
    pub pin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    SendMessage(EncryptedEnvelope),
    Delivered(DeliveryAck),
    Typing(TypingIndicator),
    Read(ReadReceipt),
    Reaction(Reaction),
    SaveInChat(SaveInChat),
    CallSignal(CallSignal),
    PinMessage(PinMessage),
    SendGroupMessage {
        group_id: Uuid,
        envelope: EncryptedEnvelope,
    },
    WipeCommand(WipeRequest),
    WipeAck(WipeAckDto),
    Error {
        message: String,
    },
}
