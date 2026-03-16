/**
 * XChaCha20-Poly1305 authenticated encryption.
 * Output format: [24-byte nonce][ciphertext + 16-byte tag]
 *
 * XChaCha20-Poly1305 is preferred over AES-256-GCM for:
 * - 24-byte nonce (vs 12) — practically eliminates nonce collision risk
 * - No need for hardware AES — consistent performance on mobile
 * - Same security level (256-bit key, 128-bit auth tag)
 */
import { XChaCha20Poly1305 } from '@stablelib/xchacha20poly1305';
import { randomBytes } from '@stablelib/random';

const NONCE_SIZE = 24;

/** Encrypt plaintext with a 32-byte key. Returns nonce || ciphertext+tag. */
export function encrypt(plaintext: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = randomBytes(NONCE_SIZE);
  const aead = new XChaCha20Poly1305(key);
  const sealed = aead.seal(nonce, plaintext);

  const result = new Uint8Array(NONCE_SIZE + sealed.length);
  result.set(nonce, 0);
  result.set(sealed, NONCE_SIZE);
  return result;
}

/** Decrypt data (nonce || ciphertext+tag) with a 32-byte key. */
export function decrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = data.slice(0, NONCE_SIZE);
  const sealed = data.slice(NONCE_SIZE);
  const aead = new XChaCha20Poly1305(key);
  const plaintext = aead.open(nonce, sealed);
  if (!plaintext) {
    throw new Error('Decryption failed: authentication tag mismatch');
  }
  return plaintext;
}
