/**
 * Cryptographic key pair generation:
 *   - X25519 for Diffie-Hellman key exchange
 *   - Ed25519 for digital signatures (identity keys, SignedPreKey signing)
 *
 * Uses Curve25519 (same as Signal Protocol).
 */
import * as x25519 from '@stablelib/x25519';
import { randomBytes } from '@stablelib/random';
import nacl from 'tweetnacl';

export interface KeyPair {
  publicKey: Uint8Array; // 32 bytes
  secretKey: Uint8Array; // 32 bytes
}

export interface SigningKeyPair {
  publicKey: Uint8Array;  // 32 bytes (Ed25519 public key)
  secretKey: Uint8Array;  // 64 bytes (Ed25519 secret key)
}

// ── X25519 (DH key exchange) ─────────────────────────

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

// ── Ed25519 (signing) ────────────────────────────────

/** Generate a new Ed25519 signing key pair. */
export function generateSigningKeyPair(): SigningKeyPair {
  const kp = nacl.sign.keyPair();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

/** Create a detached Ed25519 signature over message using secretKey. */
export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nacl.sign.detached(message, secretKey);
}

/** Verify a detached Ed25519 signature. */
export function verify(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return nacl.sign.detached.verify(message, signature, publicKey);
}

// ── Utility ──────────────────────────────────────────

/** Zero out a byte array in-place. */
export function zeroMemory(data: Uint8Array): void {
  data.fill(0);
}
