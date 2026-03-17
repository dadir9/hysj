/**
 * Hysj Crypto Module — React Native / Expo
 *
 * Primitives:
 *   - X25519 for Diffie-Hellman key exchange
 *   - XChaCha20-Poly1305 for authenticated encryption (24-byte nonce)
 *   - HKDF-SHA256 for key derivation
 *   - HMAC-SHA256 for chain key derivation
 *
 * Protocols:
 *   - X3DH handshake (Signal-compatible, with ML-KEM-768 hybrid post-quantum)
 *   - Double Ratchet (forward secrecy per message)
 *   - Sealed Sender (server-blind sender identity)
 *   - Onion Routing (3-hop relay, CSPRNG node selection)
 */

// Key management
export { generateKeyPair, deriveSharedSecret, zeroMemory } from './keys';
export { generateSigningKeyPair, sign, verify } from './keys';
export type { KeyPair, SigningKeyPair } from './keys';

// Symmetric encryption
export { encrypt, decrypt } from './cipher';

// Key derivation
export { hkdfDeriveKey, hmacSha256 } from './kdf';

// Encoding
export { toBase64, fromBase64, encodeUtf8, decodeUtf8 } from './encoding';

// X3DH handshake
export { x3dhInitiate, x3dhRespond } from './x3dh/x3dh';
export type { X3DHResult } from './x3dh/x3dh';

// Double Ratchet
export {
  initSender,
  initReceiver,
  ratchetEncrypt,
  ratchetDecrypt,
} from './ratchet/doubleRatchet';
export type { RatchetState, MessageHeader, EncryptedMessage } from './ratchet/types';
export { serializeState, deserializeState } from './ratchet/serialize';

// Sealed Sender
export { seal, unseal } from './sealed/sealedSender';
export type { SealedContent } from './sealed/sealedSender';

// Post-Quantum (ML-KEM-768 / FIPS 203)
export { kyberGenerateKeyPair, kyberEncapsulate, kyberDecapsulate } from './postquantum/kyberKem';
export type { KyberKeyPair, KyberEncapResult } from './postquantum/kyberKem';
export { deriveHybridSecret } from './postquantum/hybridKeyExchange';

// Onion Routing
export { wrapLayer, unwrapLayer } from './onion/onionLayer';
export { buildRoute } from './onion/onionRouter';
export type { RelayNode, OnionPacket } from './onion/onionRouter';
