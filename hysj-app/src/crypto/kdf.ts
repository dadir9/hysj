/**
 * Key derivation functions: HKDF-SHA256 and HMAC-SHA256.
 */
import { HKDF } from '@stablelib/hkdf';
import { SHA256 } from '@stablelib/sha256';
import { HMAC } from '@stablelib/hmac';

const encoder = new TextEncoder();

/** HKDF-SHA256: derive `length` bytes from input key material. */
export function hkdfDeriveKey(
  ikm: Uint8Array,
  salt: Uint8Array | undefined,
  info: string,
  length: number,
): Uint8Array {
  const infoBytes = encoder.encode(info);
  const hkdf = new HKDF(SHA256, ikm, salt, infoBytes);
  return hkdf.expand(length);
}

/** HMAC-SHA256: returns 32-byte MAC. */
export function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const hmac = new HMAC(SHA256, key);
  hmac.update(data);
  return hmac.digest();
}
