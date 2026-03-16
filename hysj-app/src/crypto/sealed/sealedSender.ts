/**
 * Sealed Sender: encrypts message so the server cannot see the sender.
 * Sender identity is encrypted INSIDE the payload, visible only to the recipient.
 *
 * Format: [4-byte pubKeyLen][ephemeral public key][encrypted inner]
 * Inner (encrypted): { senderId, certificate, payload }
 */
import { generateKeyPair, deriveSharedSecret, zeroMemory } from '../keys';
import { hkdfDeriveKey } from '../kdf';
import { encrypt, decrypt } from '../cipher';
import { toBase64, fromBase64, encodeUtf8, decodeUtf8 } from '../encoding';

export interface SealedContent {
  senderId: string;
  certificate: Uint8Array;
  payload: Uint8Array;
}

/** Seal a message: encrypt sender info inside so the server sees nothing. */
export function seal(
  plaintext: Uint8Array,
  senderId: string,
  senderCertificate: Uint8Array,
  recipientPublicKey: Uint8Array,
): Uint8Array {
  const ephemeral = generateKeyPair();
  const shared = deriveSharedSecret(ephemeral.secretKey, recipientPublicKey);
  const encKey = hkdfDeriveKey(shared, undefined, 'hysj-sealed-enc', 32);

  const inner = JSON.stringify({
    senderId,
    certificate: toBase64(senderCertificate),
    payload: toBase64(plaintext),
  });
  const innerBytes = encodeUtf8(inner);
  const encrypted = encrypt(innerBytes, encKey);

  zeroMemory(shared);
  zeroMemory(encKey);
  zeroMemory(ephemeral.secretKey);

  // Pack: [pubKey][encrypted]
  const pub = ephemeral.publicKey;
  const result = new Uint8Array(4 + pub.length + encrypted.length);
  new DataView(result.buffer).setUint32(0, pub.length, false); // big-endian
  result.set(pub, 4);
  result.set(encrypted, 4 + pub.length);
  return result;
}

/** Open a sealed message using our private key. */
export function unseal(sealedData: Uint8Array, mySecretKey: Uint8Array): SealedContent {
  const view = new DataView(sealedData.buffer, sealedData.byteOffset);
  const pubLen = view.getUint32(0, false); // big-endian
  const theirPub = sealedData.slice(4, 4 + pubLen);
  const encrypted = sealedData.slice(4 + pubLen);

  const shared = deriveSharedSecret(mySecretKey, theirPub);
  const encKey = hkdfDeriveKey(shared, undefined, 'hysj-sealed-enc', 32);
  const innerBytes = decrypt(encrypted, encKey);

  zeroMemory(shared);
  zeroMemory(encKey);

  const inner = JSON.parse(decodeUtf8(innerBytes));
  return {
    senderId: inner.senderId,
    certificate: fromBase64(inner.certificate),
    payload: fromBase64(inner.payload),
  };
}
