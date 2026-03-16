/**
 * X3DH (Extended Triple Diffie-Hellman) handshake with hybrid post-quantum.
 *
 * Follows the Signal X3DH specification + ML-KEM-768 hybrid:
 *   DH1 = X25519(IK_A, SPK_B)
 *   DH2 = X25519(EK_A, IK_B)
 *   DH3 = X25519(EK_A, SPK_B)
 *   DH4 = X25519(EK_A, OPK_B)
 *   KEM = ML-KEM-768.Encap(KyberPK_B)
 *   masterSecret = HKDF(DH1 || DH2 || DH3 || DH4 || KEM_secret)
 */
import { deriveSharedSecret, generateKeyPair, zeroMemory, type KeyPair } from '../keys';
import { hkdfDeriveKey } from '../kdf';
import { kyberEncapsulate, kyberDecapsulate } from '../postquantum/kyberKem';

export interface X3DHResult {
  sharedSecret: Uint8Array;       // 32 bytes — feed into Double Ratchet
  ephemeralPublicKey: Uint8Array;  // sent to Bob in initial message
  kyberCiphertext: Uint8Array;    // sent to Bob in initial message
}

/** Alice (initiator) side of X3DH handshake with hybrid ECC+Kyber. */
export async function x3dhInitiate(
  myIdentitySecret: Uint8Array,
  theirIdentityPublic: Uint8Array,
  theirSignedPreKey: Uint8Array,
  theirOneTimePreKey: Uint8Array,
  theirKyberPublicKey: Uint8Array,
): Promise<X3DHResult> {
  const ephemeral: KeyPair = generateKeyPair();

  // X3DH: 4 DH operations
  const dh1 = deriveSharedSecret(myIdentitySecret, theirSignedPreKey);
  const dh2 = deriveSharedSecret(ephemeral.secretKey, theirIdentityPublic);
  const dh3 = deriveSharedSecret(ephemeral.secretKey, theirSignedPreKey);
  const dh4 = deriveSharedSecret(ephemeral.secretKey, theirOneTimePreKey);

  // ML-KEM-768 encapsulation (post-quantum)
  const { ciphertext: kyberCiphertext, sharedSecret: kyberSecret } =
    await kyberEncapsulate(theirKyberPublicKey);

  // Combine all 5 secrets (4 classical + 1 post-quantum)
  const combined = concat(dh1, dh2, dh3, dh4, kyberSecret);
  const sharedSecret = hkdfDeriveKey(combined, undefined, 'hysj-x3dh-v1', 32);

  zeroMemory(dh1);
  zeroMemory(dh2);
  zeroMemory(dh3);
  zeroMemory(dh4);
  zeroMemory(kyberSecret);
  zeroMemory(combined);
  zeroMemory(ephemeral.secretKey);

  return { sharedSecret, ephemeralPublicKey: ephemeral.publicKey, kyberCiphertext };
}

/** Bob (responder) side of X3DH handshake with hybrid ECC+Kyber. */
export async function x3dhRespond(
  myIdentitySecret: Uint8Array,
  mySignedPreKeySecret: Uint8Array,
  myOneTimePreKeySecret: Uint8Array,
  myKyberSecretKey: Uint8Array,
  theirIdentityPublic: Uint8Array,
  theirEphemeralPublic: Uint8Array,
  kyberCiphertext: Uint8Array,
): Promise<Uint8Array> {
  const dh1 = deriveSharedSecret(mySignedPreKeySecret, theirIdentityPublic);
  const dh2 = deriveSharedSecret(myIdentitySecret, theirEphemeralPublic);
  const dh3 = deriveSharedSecret(mySignedPreKeySecret, theirEphemeralPublic);
  const dh4 = deriveSharedSecret(myOneTimePreKeySecret, theirEphemeralPublic);

  // ML-KEM-768 decapsulation (post-quantum)
  const kyberSecret = await kyberDecapsulate(kyberCiphertext, myKyberSecretKey);

  const combined = concat(dh1, dh2, dh3, dh4, kyberSecret);
  const sharedSecret = hkdfDeriveKey(combined, undefined, 'hysj-x3dh-v1', 32);

  zeroMemory(dh1);
  zeroMemory(dh2);
  zeroMemory(dh3);
  zeroMemory(dh4);
  zeroMemory(kyberSecret);
  zeroMemory(combined);

  return sharedSecret;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
