/**
 * Serialize/deserialize RatchetState for secure storage (AsyncStorage).
 * All byte arrays are stored as base64 strings.
 */
import { toBase64, fromBase64 } from '../encoding';
import type { RatchetState } from './types';

interface SerializedRatchetState {
  rootKey: string;
  sendingChainKey: string;
  receivingChainKey: string;
  dhSendSecret: string;
  dhSendPublic: string;
  dhReceivePublic: string;
  sendingIndex: number;
  receivingIndex: number;
  previousSendingLength: number;
  skippedKeys: Record<string, string>;
}

export function serializeState(state: RatchetState): string {
  const serialized: SerializedRatchetState = {
    rootKey: toBase64(state.rootKey),
    sendingChainKey: toBase64(state.sendingChainKey),
    receivingChainKey: toBase64(state.receivingChainKey),
    dhSendSecret: toBase64(state.dhSendSecret),
    dhSendPublic: toBase64(state.dhSendPublic),
    dhReceivePublic: toBase64(state.dhReceivePublic),
    sendingIndex: state.sendingIndex,
    receivingIndex: state.receivingIndex,
    previousSendingLength: state.previousSendingLength,
    skippedKeys: Object.fromEntries(
      Object.entries(state.skippedKeys).map(([k, v]) => [k, toBase64(v)]),
    ),
  };
  return JSON.stringify(serialized);
}

export function deserializeState(json: string): RatchetState {
  const s: SerializedRatchetState = JSON.parse(json);
  return {
    rootKey: fromBase64(s.rootKey),
    sendingChainKey: fromBase64(s.sendingChainKey),
    receivingChainKey: fromBase64(s.receivingChainKey),
    dhSendSecret: fromBase64(s.dhSendSecret),
    dhSendPublic: fromBase64(s.dhSendPublic),
    dhReceivePublic: fromBase64(s.dhReceivePublic),
    sendingIndex: s.sendingIndex,
    receivingIndex: s.receivingIndex,
    previousSendingLength: s.previousSendingLength,
    skippedKeys: Object.fromEntries(
      Object.entries(s.skippedKeys).map(([k, v]) => [k, fromBase64(v)]),
    ),
  };
}
