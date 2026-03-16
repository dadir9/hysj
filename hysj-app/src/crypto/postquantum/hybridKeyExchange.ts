/**
 * Hybrid ECC + ML-KEM key exchange.
 *
 * Combines X25519 (classical) with ML-KEM-768 (post-quantum).
 * BOTH must be broken to compromise the shared secret.
 * This provides security against both classical and quantum attackers.
 *
 * Output: HKDF(X25519_secret || ML-KEM_secret) -> 32-byte key
 */
import { deriveSharedSecret, zeroMemory } from '../keys';
import { hkdfDeriveKey } from '../kdf';
import { kyberDecapsulate } from './kyberKem';

/**
 * Derive a hybrid shared secret from:
 *   1. X25519 ECDH (classical)
 *   2. ML-KEM-768 decapsulation (post-quantum)
 */
export async function deriveHybridSecret(
  myEccSecret: Uint8Array,
  theirEccPublic: Uint8Array,
  kyberCiphertext: Uint8Array,
  myKyberSecret: Uint8Array,
): Promise<Uint8Array> {
  // 1. Classical X25519
  const eccSecret = deriveSharedSecret(myEccSecret, theirEccPublic);

  // 2. Post-Quantum ML-KEM-768
  const kyberShared = await kyberDecapsulate(kyberCiphertext, myKyberSecret);

  // 3. Combine both secrets
  const combined = new Uint8Array(eccSecret.length + kyberShared.length);
  combined.set(eccSecret, 0);
  combined.set(kyberShared, eccSecret.length);

  // 4. Derive final key
  const finalKey = hkdfDeriveKey(combined, undefined, 'hysj-hybrid-v1', 32);

  // 5. Zero intermediate secrets
  zeroMemory(eccSecret);
  zeroMemory(kyberShared);
  zeroMemory(combined);

  return finalKey;
}
