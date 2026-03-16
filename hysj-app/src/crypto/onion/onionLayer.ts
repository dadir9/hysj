/**
 * Onion routing: wrap/unwrap one layer of encryption per relay node.
 * Each layer uses ephemeral X25519 + HKDF + XChaCha20-Poly1305.
 *
 * Format: [4-byte pubLen (big-endian)][ephemeral pubKey][encrypted layer]
 * Encrypted layer contains: { next: address, payload: base64(inner) }
 */
import { generateKeyPair, deriveSharedSecret, zeroMemory } from '../keys';
import { hkdfDeriveKey } from '../kdf';
import { encrypt, decrypt } from '../cipher';
import { toBase64, fromBase64, encodeUtf8, decodeUtf8 } from '../encoding';

/** Wrap payload in one onion layer for a given relay node. */
export function wrapLayer(
  payload: Uint8Array,
  nextAddress: string,
  nodePublicKey: Uint8Array,
): Uint8Array {
  const ephemeral = generateKeyPair();
  const shared = deriveSharedSecret(ephemeral.secretKey, nodePublicKey);
  const key = hkdfDeriveKey(shared, undefined, 'hysj-onion-layer', 32);

  const layer = JSON.stringify({ next: nextAddress, payload: toBase64(payload) });
  const layerBytes = encodeUtf8(layer);
  const encrypted = encrypt(layerBytes, key);

  zeroMemory(shared);
  zeroMemory(key);
  zeroMemory(ephemeral.secretKey);

  const pub = ephemeral.publicKey;
  const result = new Uint8Array(4 + pub.length + encrypted.length);
  new DataView(result.buffer).setUint32(0, pub.length, false); // big-endian
  result.set(pub, 4);
  result.set(encrypted, 4 + pub.length);
  return result;
}

/** Unwrap one onion layer using the node's private key. */
export function unwrapLayer(
  data: Uint8Array,
  mySecretKey: Uint8Array,
): { nextAddress: string; payload: Uint8Array } {
  const view = new DataView(data.buffer, data.byteOffset);
  const pubLen = view.getUint32(0, false);
  const theirPub = data.slice(4, 4 + pubLen);
  const encrypted = data.slice(4 + pubLen);

  const shared = deriveSharedSecret(mySecretKey, theirPub);
  const key = hkdfDeriveKey(shared, undefined, 'hysj-onion-layer', 32);
  const layerBytes = decrypt(encrypted, key);

  zeroMemory(shared);
  zeroMemory(key);

  const layer = JSON.parse(decodeUtf8(layerBytes));
  return { nextAddress: layer.next, payload: fromBase64(layer.payload) };
}
