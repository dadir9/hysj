/**
 * Signal Double Ratchet implementation.
 * Provides forward secrecy per message: each message uses a unique key
 * that is deleted immediately after use.
 *
 * Fixes over the MAUI version:
 * - SkipMessageKeys correctly writes back the updated chain key
 * - Uses cryptographic random for all key generation
 */
import { generateKeyPair, deriveSharedSecret, zeroMemory } from '../keys';
import { hkdfDeriveKey, hmacSha256 } from '../kdf';
import { encrypt, decrypt } from '../cipher';
import type { RatchetState, MessageHeader, EncryptedMessage } from './types';
import { toBase64 } from '../encoding';

const MAX_SKIP = 1000;

/** Initialize as sender (Alice) after X3DH handshake. */
export function initSender(sharedSecret: Uint8Array, bobDhPublic: Uint8Array): RatchetState {
  const [rootKey, chainKey] = kdfRk(sharedSecret, new Uint8Array(32));
  const sendDh = generateKeyPair();
  const dhOut = deriveSharedSecret(sendDh.secretKey, bobDhPublic);
  const [newRoot, sendChain] = kdfRk(rootKey, dhOut);
  zeroMemory(dhOut);

  return {
    rootKey: newRoot,
    sendingChainKey: sendChain,
    receivingChainKey: chainKey,
    dhSendSecret: sendDh.secretKey,
    dhSendPublic: sendDh.publicKey,
    dhReceivePublic: bobDhPublic,
    sendingIndex: 0,
    receivingIndex: 0,
    previousSendingLength: 0,
    skippedKeys: {},
  };
}

/** Initialize as receiver (Bob) after X3DH handshake. */
export function initReceiver(sharedSecret: Uint8Array, myDhSecret: Uint8Array, myDhPublic: Uint8Array): RatchetState {
  const [rootKey, chainKey] = kdfRk(sharedSecret, new Uint8Array(32));

  return {
    rootKey,
    sendingChainKey: new Uint8Array(32),
    receivingChainKey: chainKey,
    dhSendSecret: myDhSecret,
    dhSendPublic: myDhPublic,
    dhReceivePublic: new Uint8Array(32),
    sendingIndex: 0,
    receivingIndex: 0,
    previousSendingLength: 0,
    skippedKeys: {},
  };
}

/** Encrypt a plaintext message. Mutates state. */
export function ratchetEncrypt(state: RatchetState, plaintext: Uint8Array): EncryptedMessage {
  const [newChain, msgKey] = kdfCk(state.sendingChainKey);
  state.sendingChainKey = newChain;

  const ciphertext = encrypt(plaintext, msgKey);
  zeroMemory(msgKey);

  const header: MessageHeader = {
    dhPublic: state.dhSendPublic,
    messageIndex: state.sendingIndex,
    previousChainLength: state.previousSendingLength,
  };
  state.sendingIndex++;

  return { ciphertext, header };
}

/** Decrypt a message. Mutates state. */
export function ratchetDecrypt(state: RatchetState, msg: EncryptedMessage): Uint8Array {
  const { ciphertext, header } = msg;

  // Check skipped keys first
  const skipKey = `${toBase64(header.dhPublic)}:${header.messageIndex}`;
  const skipped = state.skippedKeys[skipKey];
  if (skipped) {
    delete state.skippedKeys[skipKey];
    const plaintext = decrypt(ciphertext, skipped);
    zeroMemory(skipped);
    return plaintext;
  }

  // DH ratchet if new key from peer
  if (!uint8Eq(header.dhPublic, state.dhReceivePublic)) {
    skipMessageKeys(state, header.previousChainLength);
    performDhRatchet(state, header.dhPublic);
  }

  skipMessageKeys(state, header.messageIndex);

  const [newChain, msgKey] = kdfCk(state.receivingChainKey);
  state.receivingChainKey = newChain;
  state.receivingIndex++;

  const plaintext = decrypt(ciphertext, msgKey);
  zeroMemory(msgKey);
  return plaintext;
}

// --- Internal helpers ---

function performDhRatchet(state: RatchetState, theirDhPublic: Uint8Array): void {
  state.previousSendingLength = state.sendingIndex;
  state.sendingIndex = 0;
  state.receivingIndex = 0;
  state.dhReceivePublic = theirDhPublic;

  const dh1 = deriveSharedSecret(state.dhSendSecret, theirDhPublic);
  [state.rootKey, state.receivingChainKey] = kdfRk(state.rootKey, dh1);
  zeroMemory(dh1);

  const newDh = generateKeyPair();
  zeroMemory(state.dhSendSecret);
  state.dhSendSecret = newDh.secretKey;
  state.dhSendPublic = newDh.publicKey;

  const dh2 = deriveSharedSecret(newDh.secretKey, theirDhPublic);
  [state.rootKey, state.sendingChainKey] = kdfRk(state.rootKey, dh2);
  zeroMemory(dh2);
}

/**
 * Skip message keys up to `until` index and store them for later.
 * FIX: correctly writes back the updated receiving chain key.
 */
function skipMessageKeys(state: RatchetState, until: number): void {
  let ck = state.receivingChainKey;
  while (state.receivingIndex < until && Object.keys(state.skippedKeys).length < MAX_SKIP) {
    const [newCk, mk] = kdfCk(ck);
    const key = `${toBase64(state.dhReceivePublic)}:${state.receivingIndex}`;
    state.skippedKeys[key] = mk;
    ck = newCk;
    state.receivingIndex++;
  }
  // Write back the updated chain key
  state.receivingChainKey = ck;
}

/** KDF for root chain: returns [new root key, chain key]. */
function kdfRk(rk: Uint8Array, dh: Uint8Array): [Uint8Array, Uint8Array] {
  const derived = hkdfDeriveKey(dh, rk, 'hysj-ratchet-root', 64);
  return [derived.slice(0, 32), derived.slice(32)];
}

/** KDF for message chain: returns [new chain key, message key]. */
function kdfCk(ck: Uint8Array): [Uint8Array, Uint8Array] {
  const mk = hmacSha256(ck, new Uint8Array([0x01]));
  const nk = hmacSha256(ck, new Uint8Array([0x02]));
  return [nk, mk];
}

function uint8Eq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
