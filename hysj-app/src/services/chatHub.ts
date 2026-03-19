import * as Crypto from 'expo-crypto';
import * as SignalR from '@microsoft/signalr';
import { HUB_URL } from './config';
import { secureGetItem, secureSetItem, secureRemoveItem } from './secureStorage';
import {
  ratchetEncrypt,
  ratchetDecrypt,
  serializeState,
  deserializeState,
  encodeUtf8,
  decodeUtf8,
  toBase64,
  fromBase64,
} from '../crypto';
import type { RatchetState, EncryptedMessage, MessageHeader } from '../crypto';

let _connection: SignalR.HubConnection | null = null;

export const getHub = () => _connection;

export const startHub = async (): Promise<SignalR.HubConnection> => {
  if (_connection?.state === SignalR.HubConnectionState.Connected) return _connection;

  _connection = new SignalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: async () => {
        const token = await secureGetItem('token');
        return token ?? '';
      },
    })
    .withAutomaticReconnect()
    .configureLogging(SignalR.LogLevel.Warning)
    .build();

  await _connection.start();
  return _connection;
};

export const stopHub = async () => {
  await _connection?.stop();
  _connection = null;
};

/**
 * Acknowledge delivery of a message to the server.
 * This tells the backend to delete the message from Redis.
 */
export const acknowledgeDelivery = async (
  messageId: string,
  recipientDeviceId: string,
): Promise<void> => {
  if (!_connection || _connection.state !== SignalR.HubConnectionState.Connected) return;
  await _connection.invoke('AcknowledgeDelivery', {
    MessageId: messageId,
    RecipientDeviceId: recipientDeviceId,
  });
};

// ── Ratchet State Persistence ──────────────────────────

const RATCHET_KEY_PREFIX = 'ratchet:';

export async function loadRatchetState(conversationId: string): Promise<RatchetState | null> {
  const json = await secureGetItem(`${RATCHET_KEY_PREFIX}${conversationId}`);
  if (!json) return null;
  return deserializeState(json);
}

export async function saveRatchetState(conversationId: string, state: RatchetState): Promise<void> {
  await secureSetItem(`${RATCHET_KEY_PREFIX}${conversationId}`, serializeState(state));
}

export async function deleteRatchetState(conversationId: string): Promise<void> {
  await secureRemoveItem(`${RATCHET_KEY_PREFIX}${conversationId}`);
}

// ── Wire format: JSON envelope with base64-encoded fields ──
// IMPORTANT: Sender identity (su/sn) is NEVER included in the wire format.
// It is embedded inside the ratchet-encrypted payload so the server cannot
// read who sent the message (Sealed Sender principle).

interface WireMessage {
  /** header: sender DH public key */
  dp: string;
  /** header: message index */
  mi: number;
  /** header: previous chain length */
  pc: number;
  /** ciphertext */
  ct: string;
  /** X3DH handshake data (present only on the first message of a session) */
  x3dh?: {
    /** Alice's ephemeral public key (base64) */
    ek: string;
    /** Kyber ciphertext (base64) */
    kc: string;
    /** Alice's X25519 identity DH public key (base64) — used for X3DH DH ops */
    ik: string;
    /** One-time pre-key used (base64) */
    ok: string;
  };
}

/** Plaintext envelope placed inside the ratchet-encrypted ciphertext */
interface InnerPayload {
  /** sender user id */
  su: string;
  /** sender username */
  sn: string;
  /** message text */
  t: string;
}

function encryptedToWire(
  msg: EncryptedMessage,
  handshake?: { ephemeralPublicKey: string; kyberCiphertext: string; identityDhPublicKey: string; oneTimePreKeyUsed?: string },
): string {
  const wire: WireMessage = {
    dp: toBase64(msg.header.dhPublic),
    mi: msg.header.messageIndex,
    pc: msg.header.previousChainLength,
    ct: toBase64(msg.ciphertext),
  };
  if (handshake) {
    wire.x3dh = {
      ek: handshake.ephemeralPublicKey,
      kc: handshake.kyberCiphertext,
      ik: handshake.identityDhPublicKey,
      ok: handshake.oneTimePreKeyUsed ?? '',
    };
  }
  return btoa(JSON.stringify(wire));
}

function wireToEncrypted(blob: string): {
  encrypted: EncryptedMessage;
  x3dh?: { ephemeralPublicKey: string; kyberCiphertext: string; identityDhPublicKey: string; oneTimePreKeyUsed: string };
} | null {
  try {
    const wire: WireMessage = JSON.parse(atob(blob));
    const header: MessageHeader = {
      dhPublic: fromBase64(wire.dp),
      messageIndex: wire.mi,
      previousChainLength: wire.pc,
    };
    const result: {
      encrypted: EncryptedMessage;
      x3dh?: { ephemeralPublicKey: string; kyberCiphertext: string; identityDhPublicKey: string; oneTimePreKeyUsed: string };
    } = {
      encrypted: { ciphertext: fromBase64(wire.ct), header },
    };
    if (wire.x3dh) {
      result.x3dh = {
        ephemeralPublicKey: wire.x3dh.ek,
        kyberCiphertext: wire.x3dh.kc,
        identityDhPublicKey: wire.x3dh.ik,
        oneTimePreKeyUsed: wire.x3dh.ok,
      };
    }
    return result;
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────

/**
 * Encrypt and send a message over the hub.
 * Mutates ratchetState and persists it to AsyncStorage.
 */
export const sendMessage = async (
  recipientDeviceId: string,
  senderUserId: string,
  senderUsername: string,
  text: string,
  conversationId: string,
  ratchetState: RatchetState,
): Promise<string> => {
  if (!_connection || _connection.state !== SignalR.HubConnectionState.Connected) {
    throw new Error('Hub not connected');
  }

  const messageId = Crypto.randomUUID();
  // Embed sender identity INSIDE the encrypted payload so the server never sees it
  const innerPayload: InnerPayload = { su: senderUserId, sn: senderUsername, t: text };
  const plaintext = encodeUtf8(JSON.stringify(innerPayload));
  const encrypted = ratchetEncrypt(ratchetState, plaintext);

  // Persist updated state immediately after encryption
  await saveRatchetState(conversationId, ratchetState);

  // Include X3DH handshake data in the first message so the responder can establish the session
  // Lazy import to avoid circular dependency (sessionManager imports from chatHub)
  const { consumePendingHandshake } = await import('./sessionManager');
  const handshake = await consumePendingHandshake(conversationId);
  const blob = encryptedToWire(encrypted, handshake ?? undefined);
  await _connection.invoke('SendMessage', {
    MessageId: messageId,
    RecipientDeviceId: recipientDeviceId,
    EncryptedBlob: blob,
  });

  return messageId;
};

/**
 * Decrypt a received blob using ratchet state.
 * Mutates ratchetState and persists it to AsyncStorage.
 * Returns null if decryption fails (e.g. no ratchet state for this sender).
 */
export const decryptReceived = async (
  blob: string,
  conversationId: string,
  ratchetState: RatchetState,
): Promise<{ senderUserId: string; senderUsername: string; text: string } | null> => {
  const parsed = wireToEncrypted(blob);
  if (!parsed) return null;

  try {
    const plainBytes = ratchetDecrypt(ratchetState, parsed.encrypted);
    // Persist updated state immediately after decryption
    await saveRatchetState(conversationId, ratchetState);

    // Sender identity is embedded inside the encrypted payload
    const inner: InnerPayload = JSON.parse(decodeUtf8(plainBytes));
    return {
      senderUserId: inner.su,
      senderUsername: inner.sn,
      text: inner.t,
    };
  } catch {
    return null;
  }
};

/**
 * Extract X3DH handshake data from a received blob (if present).
 * Used by the responder (Bob) to establish an incoming session from the first message.
 */
export const extractX3DHHandshake = (blob: string): {
  ephemeralPublicKey: string;
  kyberCiphertext: string;
  identityDhPublicKey: string;
  oneTimePreKeyUsed: string;
} | null => {
  const parsed = wireToEncrypted(blob);
  return parsed?.x3dh ?? null;
};

// ── Group Message Handler ────────────────────────────

export type GroupMessageCallback = (msg: {
  messageId: string;
  groupId: string;
  senderDisplay: string;
  encryptedBlob: string;
}) => void;

const _groupMessageCallbacks: GroupMessageCallback[] = [];

export function onGroupMessage(callback: GroupMessageCallback): () => void {
  _groupMessageCallbacks.push(callback);
  return () => {
    const idx = _groupMessageCallbacks.indexOf(callback);
    if (idx >= 0) _groupMessageCallbacks.splice(idx, 1);
  };
}

export function registerGroupMessageListener(): void {
  if (!_connection) return;
  // Backend sends 4 separate args: groupId, messageId, senderDisplay, encryptedBlob
  _connection.on('ReceiveGroupMessage', (groupId: string, messageId: string, senderDisplay: string, encryptedBlob: string) => {
    const msg = { groupId, messageId, senderDisplay, encryptedBlob };
    for (const cb of _groupMessageCallbacks) {
      try { cb(msg); } catch { /* ignore */ }
    }
  });
}

// ── Delivery Status Events ───────────────────────────

export type DeliveryStatusCallback = (data: { messageId: string; status: 'delivered' | 'queued' | 'read' }) => void;

const _deliveryStatusCallbacks: DeliveryStatusCallback[] = [];

export function onDeliveryStatus(callback: DeliveryStatusCallback): () => void {
  _deliveryStatusCallbacks.push(callback);
  return () => {
    const idx = _deliveryStatusCallbacks.indexOf(callback);
    if (idx >= 0) _deliveryStatusCallbacks.splice(idx, 1);
  };
}

export function registerDeliveryStatusListeners(): void {
  if (!_connection) return;

  // Backend sends: SendAsync("MessageDelivered", messageId) — plain string
  _connection.on('MessageDelivered', (messageId: string) => {
    for (const cb of _deliveryStatusCallbacks) {
      try { cb({ messageId, status: 'delivered' }); } catch { /* ignore */ }
    }
  });

  // Backend sends: SendAsync("MessageQueued", messageId) — plain string
  _connection.on('MessageQueued', (messageId: string) => {
    for (const cb of _deliveryStatusCallbacks) {
      try { cb({ messageId, status: 'queued' }); } catch { /* ignore */ }
    }
  });

  // Backend sends: SendAsync("MessageRead", messageId, readByUserId) — two strings
  _connection.on('MessageRead', (messageId: string, _readBy: string) => {
    for (const cb of _deliveryStatusCallbacks) {
      try { cb({ messageId, status: 'read' }); } catch { /* ignore */ }
    }
  });
}

