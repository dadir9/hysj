/**
 * Key Manager: generates, persists, and uploads cryptographic key bundles.
 *
 * Manages:
 *   - Identity key pair (X25519, long-lived)
 *   - Signed pre-key (X25519, rotated periodically)
 *   - One-time pre-keys (X25519, consumed on use)
 *   - Kyber key pair (ML-KEM-768, for post-quantum hybrid X3DH)
 *
 * Keys are stored in AsyncStorage (should migrate to SecureStore in production).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateKeyPair,
  toBase64,
  fromBase64,
  kyberGenerateKeyPair,
  type KeyPair,
  type KyberKeyPair,
} from '../crypto';
import * as api from './api';

// ── Storage keys ──────────────────────────────────────
const IDENTITY_SECRET   = 'keys:identity:secret';
const IDENTITY_PUBLIC   = 'keys:identity:public';
const SPK_SECRET        = 'keys:spk:secret';
const SPK_PUBLIC        = 'keys:spk:public';
const KYBER_SECRET      = 'keys:kyber:secret';
const KYBER_PUBLIC      = 'keys:kyber:public';
const OTP_PREFIX        = 'keys:otp:';
const OTP_INDEX         = 'keys:otp:index';

const PREKEY_BATCH_SIZE = 20;
const PREKEY_REPLENISH_THRESHOLD = 5;

// ── Identity key pair ──────────────────────────────────

export async function getOrCreateIdentityKeyPair(): Promise<KeyPair> {
  const existing = await AsyncStorage.getItem(IDENTITY_SECRET);
  if (existing) {
    const pub = await AsyncStorage.getItem(IDENTITY_PUBLIC);
    return {
      secretKey: fromBase64(existing),
      publicKey: fromBase64(pub!),
    };
  }
  const kp = generateKeyPair();
  await AsyncStorage.setItem(IDENTITY_SECRET, toBase64(kp.secretKey));
  await AsyncStorage.setItem(IDENTITY_PUBLIC, toBase64(kp.publicKey));
  return kp;
}

export async function getIdentityPublicKey(): Promise<Uint8Array | null> {
  const pub = await AsyncStorage.getItem(IDENTITY_PUBLIC);
  return pub ? fromBase64(pub) : null;
}

// ── Signed pre-key ─────────────────────────────────────

export async function getOrCreateSignedPreKey(): Promise<KeyPair> {
  const existing = await AsyncStorage.getItem(SPK_SECRET);
  if (existing) {
    const pub = await AsyncStorage.getItem(SPK_PUBLIC);
    return {
      secretKey: fromBase64(existing),
      publicKey: fromBase64(pub!),
    };
  }
  return rotateSignedPreKey();
}

export async function rotateSignedPreKey(): Promise<KeyPair> {
  const kp = generateKeyPair();
  await AsyncStorage.setItem(SPK_SECRET, toBase64(kp.secretKey));
  await AsyncStorage.setItem(SPK_PUBLIC, toBase64(kp.publicKey));
  return kp;
}

// ── Kyber key pair (ML-KEM-768) ─────────────────────────

export async function getOrCreateKyberKeyPair(): Promise<KyberKeyPair> {
  const existing = await AsyncStorage.getItem(KYBER_SECRET);
  if (existing) {
    const pub = await AsyncStorage.getItem(KYBER_PUBLIC);
    return {
      secretKey: fromBase64(existing),
      publicKey: fromBase64(pub!),
    };
  }
  const kp = await kyberGenerateKeyPair();
  await AsyncStorage.setItem(KYBER_SECRET, toBase64(kp.secretKey));
  await AsyncStorage.setItem(KYBER_PUBLIC, toBase64(kp.publicKey));
  return kp;
}

// ── One-time pre-keys ──────────────────────────────────

/** Generate a batch of one-time pre-keys and store secrets locally. */
export async function generateOneTimePreKeys(count: number = PREKEY_BATCH_SIZE): Promise<Uint8Array[]> {
  const rawIndex = await AsyncStorage.getItem(OTP_INDEX);
  let startIndex = rawIndex ? parseInt(rawIndex, 10) : 0;
  const publicKeys: Uint8Array[] = [];

  for (let i = 0; i < count; i++) {
    const kp = generateKeyPair();
    const idx = startIndex + i;
    await AsyncStorage.setItem(`${OTP_PREFIX}${idx}:secret`, toBase64(kp.secretKey));
    await AsyncStorage.setItem(`${OTP_PREFIX}${idx}:public`, toBase64(kp.publicKey));
    publicKeys.push(kp.publicKey);
  }
  await AsyncStorage.setItem(OTP_INDEX, String(startIndex + count));
  return publicKeys;
}

/** Look up a one-time pre-key secret by its public key. */
export async function consumeOneTimePreKey(publicKeyB64: string): Promise<Uint8Array | null> {
  const rawIndex = await AsyncStorage.getItem(OTP_INDEX);
  const total = rawIndex ? parseInt(rawIndex, 10) : 0;
  for (let i = 0; i < total; i++) {
    const pub = await AsyncStorage.getItem(`${OTP_PREFIX}${i}:public`);
    if (pub === publicKeyB64) {
      const secret = await AsyncStorage.getItem(`${OTP_PREFIX}${i}:secret`);
      // Mark as consumed
      await AsyncStorage.removeItem(`${OTP_PREFIX}${i}:secret`);
      await AsyncStorage.removeItem(`${OTP_PREFIX}${i}:public`);
      return secret ? fromBase64(secret) : null;
    }
  }
  return null;
}

// ── Registration bundle ────────────────────────────────

/**
 * Generate all keys needed for registration and return them as
 * arrays compatible with the API's register endpoint.
 */
export async function generateRegistrationBundle(): Promise<{
  identityPublicKey: string;
  signedPreKey: string;
  signedPreKeySig: string;
  oneTimePreKeys: string[];
  kyberPublicKey: string;
}> {
  const identity = await getOrCreateIdentityKeyPair();
  const spk = await getOrCreateSignedPreKey();
  const kyber = await getOrCreateKyberKeyPair();
  const otpKeys = await generateOneTimePreKeys(PREKEY_BATCH_SIZE);

  // Signature placeholder — in production, sign SPK with identity key
  // using Ed25519 (requires adding an Ed25519 key alongside X25519)
  const sigPlaceholder = new Uint8Array(64);

  return {
    identityPublicKey: toBase64(identity.publicKey),
    signedPreKey: toBase64(spk.publicKey),
    signedPreKeySig: toBase64(sigPlaceholder),
    oneTimePreKeys: otpKeys.map(k => toBase64(k)),
    kyberPublicKey: toBase64(kyber.publicKey),
  };
}

// ── PreKey replenishment ────────────────────────────────

/**
 * Check the server's pre-key count and upload more if below threshold.
 * Call this periodically (e.g., on app start or after receiving messages).
 */
export async function replenishPreKeysIfNeeded(deviceId: string): Promise<void> {
  try {
    const res = await api.getPreKeyCount(deviceId);
    const count = res.data?.count ?? res.data;
    if (typeof count === 'number' && count < PREKEY_REPLENISH_THRESHOLD) {
      const newKeys = await generateOneTimePreKeys(PREKEY_BATCH_SIZE);
      await api.uploadPreKeys(deviceId, newKeys.map(k => toBase64(k)));
    }
  } catch {
    // Silently fail — will retry next time
  }
}

// ── Wipe all keys ───────────────────────────────────────

/** Delete all locally stored keys. Called during remote wipe. */
export async function wipeAllKeys(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const keyManagerKeys = allKeys.filter(k => k.startsWith('keys:'));
  if (keyManagerKeys.length > 0) {
    await AsyncStorage.multiRemove(keyManagerKeys);
  }
}
