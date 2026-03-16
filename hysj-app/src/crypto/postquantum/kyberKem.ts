/**
 * ML-KEM-768 (FIPS 203) Key Encapsulation Mechanism.
 * This is REAL post-quantum cryptography — not a fallback.
 *
 * ML-KEM-768 provides ~192-bit security against both classical and quantum attacks.
 * Uses the `mlkem` package: pure TypeScript, no native dependencies.
 *
 * Key sizes:
 *   Public key:     1184 bytes
 *   Secret key:     2400 bytes
 *   Ciphertext:     1088 bytes
 *   Shared secret:  32 bytes
 */
import { MlKem768 } from 'mlkem';

const kem = new MlKem768();

export interface KyberKeyPair {
  publicKey: Uint8Array;  // 1184 bytes
  secretKey: Uint8Array;  // 2400 bytes
}

export interface KyberEncapResult {
  ciphertext: Uint8Array;    // 1088 bytes — sent to the other party
  sharedSecret: Uint8Array;  // 32 bytes
}

/** Generate a new ML-KEM-768 key pair. */
export async function kyberGenerateKeyPair(): Promise<KyberKeyPair> {
  const [publicKey, secretKey] = await kem.generateKeyPair();
  return { publicKey, secretKey };
}

/** Encapsulate: generate a shared secret using their public key. */
export async function kyberEncapsulate(theirPublicKey: Uint8Array): Promise<KyberEncapResult> {
  const [ciphertext, sharedSecret] = await kem.encap(theirPublicKey);
  return { ciphertext, sharedSecret };
}

/** Decapsulate: recover the shared secret from ciphertext + our secret key. */
export async function kyberDecapsulate(
  ciphertext: Uint8Array,
  mySecretKey: Uint8Array,
): Promise<Uint8Array> {
  return await kem.decap(ciphertext, mySecretKey);
}
