/**
 * X25519 key pair generation and Diffie-Hellman shared secret derivation.
 * Uses Curve25519 (same as Signal Protocol).
 */
import * as x25519 from '@stablelib/x25519';
import { randomBytes } from '@stablelib/random';

export interface KeyPair {
  publicKey: Uint8Array; // 32 bytes
  secretKey: Uint8Array; // 32 bytes
}

/** Generate a new X25519 key pair using a CSPRNG. */
export function generateKeyPair(): KeyPair {
  const secretKey = randomBytes(32);
  const publicKey = x25519.scalarMultBase(secretKey);
  return { publicKey, secretKey };
}

/** Derive a raw shared secret from our secret key and their public key. */
export function deriveSharedSecret(
  mySecretKey: Uint8Array,
  theirPublicKey: Uint8Array,
): Uint8Array {
  return x25519.sharedKey(mySecretKey, theirPublicKey);
}

/** Zero out a byte array in-place. */
export function zeroMemory(data: Uint8Array): void {
  data.fill(0);
}
