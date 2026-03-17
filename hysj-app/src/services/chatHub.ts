import * as SignalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HUB_URL } from './config';
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

  const token = await AsyncStorage.getItem('token');

  _connection = new SignalR.HubConnectionBuilder()
    .withUrl(HUB_URL, { accessTokenFactory: () => token ?? '' })
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
  const json = await AsyncStorage.getItem(`${RATCHET_KEY_PREFIX}${conversationId}`);
  if (!json) return null;
  return deserializeState(json);
}

export async function saveRatchetState(conversationId: string, state: RatchetState): Promise<void> {
  await AsyncStorage.setItem(`${RATCHET_KEY_PREFIX}${conversationId}`, serializeState(state));
}

export async function deleteRatchetState(conversationId: string): Promise<void> {
  await AsyncStorage.removeItem(`${RATCHET_KEY_PREFIX}${conversationId}`);
}

// ── Wire format: JSON envelope with base64-encoded fields ──

interface WireMessage {
  /** sender user id — needed so receiver knows who sent it */
  su: string;
  /** sender username */
  sn: string;
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
    /** Alice's identity public key (base64) */
    ik: string;
    /** One-time pre-key used (base64) */
    ok: string;
  };
}

function encryptedToWire(
  senderUserId: string,
  senderUsername: string,
  msg: EncryptedMessage,
  handshake?: { ephemeralPublicKey: string; kyberCiphertext: string; identityPublicKey: string; oneTimePreKeyUsed?: string },
): string {
  const wire: WireMessage = {
    su: senderUserId,
    sn: senderUsername,
    dp: toBase64(msg.header.dhPublic),
    mi: msg.header.messageIndex,
    pc: msg.header.previousChainLength,
    ct: toBase64(msg.ciphertext),
  };
  if (handshake) {
    wire.x3dh = {
      ek: handshake.ephemeralPublicKey,
      kc: handshake.kyberCiphertext,
      ik: handshake.identityPublicKey,
      ok: handshake.oneTimePreKeyUsed ?? '',
    };
  }
  return btoa(JSON.stringify(wire));
}

function wireToEncrypted(blob: string): {
  senderUserId: string;
  senderUsername: string;
  encrypted: EncryptedMessage;
  x3dh?: { ephemeralPublicKey: string; kyberCiphertext: string; identityPublicKey: string; oneTimePreKeyUsed: string };
} | null {
  try {
    const wire: WireMessage = JSON.parse(atob(blob));
    const header: MessageHeader = {
      dhPublic: fromBase64(wire.dp),
      messageIndex: wire.mi,
      previousChainLength: wire.pc,
    };
    const result: ReturnType<typeof wireToEncrypted> = {
      senderUserId: wire.su,
      senderUsername: wire.sn,
      encrypted: { ciphertext: fromBase64(wire.ct), header },
    };
    if (wire.x3dh) {
      result.x3dh = {
        ephemeralPublicKey: wire.x3dh.ek,
        kyberCiphertext: wire.x3dh.kc,
        identityPublicKey: wire.x3dh.ik,
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

  const messageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const plaintext = encodeUtf8(text);
  const encrypted = ratchetEncrypt(ratchetState, plaintext);

  // Persist updated state immediately after encryption
  await saveRatchetState(conversationId, ratchetState);

  // Include X3DH handshake data in the first message so the responder can establish the session
  // Lazy import to avoid circular dependency (sessionManager imports from chatHub)
  const { consumePendingHandshake } = await import('./sessionManager');
  const handshake = await consumePendingHandshake(conversationId);
  const blob = encryptedToWire(senderUserId, senderUsername, encrypted, handshake ?? undefined);
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
    const plaintext = ratchetDecrypt(ratchetState, parsed.encrypted);
    // Persist updated state immediately after decryption
    await saveRatchetState(conversationId, ratchetState);

    return {
      senderUserId: parsed.senderUserId,
      senderUsername: parsed.senderUsername,
      text: decodeUtf8(plaintext),
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
  identityPublicKey: string;
  oneTimePreKeyUsed: string;
} | null => {
  const parsed = wireToEncrypted(blob);
  return parsed?.x3dh ?? null;
};

/**
 * Extract sender info from a blob without decrypting.
 * Works for both ratchet wire format and legacy format.
 */
export const extractSender = (blob: string): { senderUserId: string; senderUsername: string } | null => {
  try {
    const parsed = JSON.parse(atob(blob));
    // Ratchet wire format uses short keys
    if (parsed.su && parsed.sn) return { senderUserId: parsed.su, senderUsername: parsed.sn };
    // Legacy format
    if (parsed.senderUserId && parsed.senderUsername) return parsed;
    return null;
  } catch {
    return null;
  }
};

/**
 * Legacy fallback: decode a non-encrypted blob (for backward compat with
 * messages sent before ratchet was enabled).
 */
export const decodeLegacyBlob = (blob: string): { senderUserId: string; senderUsername: string; text: string } | null => {
  try {
    return JSON.parse(atob(blob));
  } catch {
    return null;
  }
};
