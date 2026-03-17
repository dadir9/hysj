/**
 * Remote Wipe Service: handles receiving and executing wipe commands.
 *
 * Wipe types:
 *   - All: delete everything on this device (keys, messages, sessions, auth)
 *   - Conversation: delete one conversation's messages and ratchet state
 *   - Device: same as All but targeted at a specific device
 *
 * Registers a SignalR listener for WipeCommand events from the server.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHub } from './chatHub';
import { wipeAllKeys } from './keyManager';
import { secureGetItem, secureSetItem, secureRemoveItem, destroyMasterKey } from './secureStorage';

export type WipeType = 'All' | 'Conversation' | 'Device';

export interface WipeCommand {
  wipeId: string;
  type: WipeType;
  conversationId?: string;
  targetDeviceId?: string;
  timestamp: string;
}

type WipeListener = (command: WipeCommand) => void;
const _listeners: WipeListener[] = [];

/** Register a callback for when a wipe executes (e.g., to navigate to login). */
export function onWipeExecuted(listener: WipeListener): () => void {
  _listeners.push(listener);
  return () => {
    const idx = _listeners.indexOf(listener);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

/** Start listening for wipe commands from the server via SignalR. */
export function registerWipeListener(): void {
  const hub = getHub();
  if (!hub) return;

  hub.on('WipeCommand', async (command: WipeCommand) => {
    await executeWipe(command);

    // Acknowledge wipe to server (matches ChatHub.AcknowledgeWipe)
    try {
      const deviceId = await secureGetItem('deviceId');
      await hub.invoke('AcknowledgeWipe', {
        WipeId: command.wipeId,
        DeviceId: deviceId,
        Success: true,
      });
    } catch {
      // Best-effort ack
    }

    // Notify UI listeners
    for (const listener of _listeners) {
      try { listener(command); } catch { /* ignore */ }
    }
  });
}

/** Execute a wipe command locally. */
export async function executeWipe(command: WipeCommand): Promise<void> {
  switch (command.type) {
    case 'All':
    case 'Device':
      await wipeEverything();
      break;
    case 'Conversation':
      if (command.conversationId) {
        await wipeConversation(command.conversationId);
      }
      break;
  }
}

/** Delete ALL local data: keys, messages, conversations, auth session. */
async function wipeEverything(): Promise<void> {
  // Wipe all crypto keys
  await wipeAllKeys();

  // Destroy the master encryption key — makes all encrypted data unrecoverable
  await destroyMasterKey();

  // Get all AsyncStorage keys and remove everything
  const allKeys = await AsyncStorage.getAllKeys();
  if (allKeys.length > 0) {
    await AsyncStorage.multiRemove([...allKeys]);
  }
}

/** Delete a single conversation's messages and ratchet state. */
async function wipeConversation(conversationId: string): Promise<void> {
  // Remove ratchet state
  await secureRemoveItem(`ratchet:${conversationId}`);

  // Remove X3DH pending handshake data
  await secureRemoveItem(`x3dh:pending:${conversationId}`);

  // Remove messages
  await secureRemoveItem(`messages:${conversationId}`);

  // Remove conversation from list
  const raw = await secureGetItem('conversations');
  if (raw) {
    const convs = JSON.parse(raw);
    const filtered = convs.filter((c: { id: string }) => c.id !== conversationId);
    await secureSetItem('conversations', JSON.stringify(filtered));
  }
}

/**
 * Manually trigger a local wipe (e.g., user taps "wipe this device" in settings).
 * This does NOT send a wipe command to the server — use api.wipeAll/wipeDevice for that.
 */
export async function localWipeAll(): Promise<void> {
  await wipeEverything();
}
