/**
 * Session Manager: handles X3DH handshake to establish Double Ratchet sessions.
 *
 * When starting a new conversation, performs X3DH with the peer's pre-key bundle
 * to derive a shared secret, then initializes the Double Ratchet.
 */
import {
  x3dhInitiate,
  x3dhRespond,
  initSender,
  initReceiver,
  generateKeyPair,
  fromBase64,
  toBase64,
  verify,
  type RatchetState,
} from '../crypto';
import { getPreKeyBundle } from './api';
import {
  getOrCreateIdentityKeyPair,
  getOrCreateSignedPreKey,
  getOrCreateKyberKeyPair,
  consumeOneTimePreKey,
} from './keyManager';
import { loadRatchetState, saveRatchetState } from './chatHub';

/**
 * Establish a new outgoing session with a peer (Alice/initiator side).
 * Fetches the peer's pre-key bundle, runs X3DH, and initializes the ratchet.
 * Returns the ratchet state (already persisted).
 */
export async function establishOutgoingSession(
  conversationId: string,
  peerDeviceId: string,
): Promise<RatchetState> {
  // Check if we already have a session
  const existing = await loadRatchetState(conversationId);
  if (existing) return existing;

  // Fetch peer's pre-key bundle from server
  const res = await getPreKeyBundle(peerDeviceId);
  const bundle = res.data;

  // Verify SignedPreKey signature using peer's Ed25519 identity key
  const peerIdentitySigningKey = fromBase64(bundle.identityPublicKey);
  const peerSignedPreKey = fromBase64(bundle.signedPreKey);
  const peerSignedPreKeySig = fromBase64(bundle.signedPreKeySig);
  if (!verify(peerSignedPreKey, peerSignedPreKeySig, peerIdentitySigningKey)) {
    throw new Error('SignedPreKey signature verification failed — possible MITM attack');
  }

  // Use X25519 DH identity keys for X3DH (not Ed25519 signing keys)
  const identity = await getOrCreateIdentityKeyPair();
  const peerIdentityDhKey = fromBase64(bundle.identityDhPublicKey);

  // X3DH handshake (hybrid with ML-KEM-768)
  const { sharedSecret, ephemeralPublicKey, kyberCiphertext } = await x3dhInitiate(
    identity.secretKey,
    peerIdentityDhKey,
    peerSignedPreKey,
    fromBase64(bundle.oneTimePreKey),
    fromBase64(bundle.kyberPublicKey),
  );

  // Initialize Double Ratchet as sender
  const state = initSender(sharedSecret, fromBase64(bundle.signedPreKey));

  // Persist
  await saveRatchetState(conversationId, state);

  // Store handshake data so the first message includes it for the responder.
  // identityDhPublicKey = sender's X25519 DH key (for X3DH DH operations)
  const { secureSetItem } = await import('./secureStorage');
  await secureSetItem(
    `x3dh:pending:${conversationId}`,
    JSON.stringify({
      ephemeralPublicKey: toBase64(ephemeralPublicKey),
      kyberCiphertext: toBase64(kyberCiphertext),
      identityDhPublicKey: toBase64(identity.publicKey),
      oneTimePreKeyUsed: bundle.oneTimePreKey,
    }),
  );

  return state;
}

/**
 * Handle an incoming X3DH handshake (Bob/responder side).
 * Called when we receive a first message with handshake data.
 * Returns the initialized ratchet state (already persisted).
 */
export async function establishIncomingSession(
  conversationId: string,
  handshakeData: {
    ephemeralPublicKey: string;
    kyberCiphertext: string;
    identityDhPublicKey: string;
    oneTimePreKeyUsed: string;
  },
): Promise<RatchetState> {
  const identity = await getOrCreateIdentityKeyPair();
  const spk = await getOrCreateSignedPreKey();
  const kyber = await getOrCreateKyberKeyPair();

  // Find the consumed one-time pre-key
  const otpSecret = await consumeOneTimePreKey(handshakeData.oneTimePreKeyUsed);
  if (!otpSecret) {
    throw new Error('One-time pre-key not found or already consumed');
  }

  // X3DH responder side (hybrid with ML-KEM-768)
  // Uses X25519 DH identity keys (not Ed25519 signing keys)
  const sharedSecret = await x3dhRespond(
    identity.secretKey,
    spk.secretKey,
    otpSecret,
    kyber.secretKey,
    fromBase64(handshakeData.identityDhPublicKey),
    fromBase64(handshakeData.ephemeralPublicKey),
    fromBase64(handshakeData.kyberCiphertext),
  );

  // Initialize Double Ratchet as receiver
  const state = initReceiver(sharedSecret, spk.secretKey, spk.publicKey);

  // Persist
  await saveRatchetState(conversationId, state);

  return state;
}

/**
 * Get pending X3DH handshake data for the first message in a conversation.
 * Returns null if there's no pending handshake (session already established).
 */
export async function consumePendingHandshake(
  conversationId: string,
): Promise<{
  ephemeralPublicKey: string;
  kyberCiphertext: string;
  identityDhPublicKey: string;
  oneTimePreKeyUsed?: string;
} | null> {
  const { secureGetItem, secureRemoveItem } = await import('./secureStorage');
  const key = `x3dh:pending:${conversationId}`;
  const raw = await secureGetItem(key);
  if (!raw) return null;
  await secureRemoveItem(key);
  return JSON.parse(raw);
}
