/**
 * Secure Storage: encrypted wrapper around AsyncStorage.
 *
 * All data is encrypted at rest using XChaCha20-Poly1305 with a
 * device-local master key. The master key is generated once via
 * expo-crypto's getRandomBytes and stored under a reserved
 * AsyncStorage slot (the only plaintext value).
 *
 * Architecture:
 *   1. On first use, generate a 32-byte random master key
 *   2. Store master key in AsyncStorage under MASTER_KEY_SLOT (base64)
 *   3. For each setItem(key, value):
 *      - Derive a per-key encryption key via HKDF(masterKey, key)
 *      - Encrypt value with XChaCha20-Poly1305
 *      - Store base64(nonce || ciphertext || tag) in AsyncStorage
 *   4. For each getItem(key):
 *      - Derive the same per-key encryption key
 *      - Decrypt and return plaintext
 *
 * The master key itself is the only sensitive plaintext in AsyncStorage.
 * On a full wipe, the master key is deleted, making all encrypted data
 * unrecoverable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encrypt, decrypt } from '../crypto/cipher';
import { hkdfDeriveKey } from '../crypto/kdf';
import { toBase64, fromBase64, encodeUtf8, decodeUtf8 } from '../crypto/encoding';

const MASTER_KEY_SLOT = '__hysj_mk__';
const KEY_DERIVATION_INFO = 'hysj-secure-storage-v1';

let _masterKey: Uint8Array | null = null;

/** Initialize or retrieve the master encryption key. */
async function getMasterKey(): Promise<Uint8Array> {
  if (_masterKey) return _masterKey;

  const stored = await AsyncStorage.getItem(MASTER_KEY_SLOT);
  if (stored) {
    _masterKey = fromBase64(stored);
    return _masterKey;
  }

  // Generate a new 32-byte master key using expo-crypto
  const { getRandomBytes } = await import('expo-crypto');
  const key = getRandomBytes(32);
  _masterKey = new Uint8Array(key);
  await AsyncStorage.setItem(MASTER_KEY_SLOT, toBase64(_masterKey));
  return _masterKey;
}

/** Derive a per-slot encryption key from the master key and the storage key name. */
function deriveSlotKey(masterKey: Uint8Array, slotName: string): Uint8Array {
  const salt = encodeUtf8(slotName);
  return hkdfDeriveKey(masterKey, salt, KEY_DERIVATION_INFO, 32);
}

/**
 * Store a value encrypted in AsyncStorage.
 * The value is encrypted with a key derived from the master key + slot name.
 */
export async function secureSetItem(key: string, value: string): Promise<void> {
  const masterKey = await getMasterKey();
  const slotKey = deriveSlotKey(masterKey, key);
  const plaintext = encodeUtf8(value);
  const ciphertext = encrypt(plaintext, slotKey);
  await AsyncStorage.setItem(key, toBase64(ciphertext));
}

/**
 * Retrieve and decrypt a value from AsyncStorage.
 * Returns null if the key doesn't exist.
 * Falls back to returning raw value if decryption fails (for migration from unencrypted data).
 */
export async function secureGetItem(key: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;

  try {
    const masterKey = await getMasterKey();
    const slotKey = deriveSlotKey(masterKey, key);
    const ciphertext = fromBase64(raw);
    const plaintext = decrypt(ciphertext, slotKey);
    return decodeUtf8(plaintext);
  } catch {
    // Migration path: if decryption fails, the data was stored before
    // encryption was enabled. Return it raw and it will be re-encrypted
    // on the next write.
    return raw;
  }
}

/** Remove an item from AsyncStorage. */
export async function secureRemoveItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/** Remove multiple items from AsyncStorage. */
export async function secureMultiRemove(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}

/** Get all keys in AsyncStorage (excluding the master key slot). */
export async function secureGetAllKeys(): Promise<readonly string[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  return allKeys.filter(k => k !== MASTER_KEY_SLOT);
}

/**
 * Destroy the master key, making all encrypted data unrecoverable.
 * Called during a full wipe.
 */
export async function destroyMasterKey(): Promise<void> {
  if (_masterKey) {
    _masterKey.fill(0);
    _masterKey = null;
  }
  await AsyncStorage.removeItem(MASTER_KEY_SLOT);
}
