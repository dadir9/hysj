/**
 * Base64 encoding/decoding for Uint8Array.
 * Uses btoa/atob available in React Native's Hermes engine.
 */

export function toBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode a UTF-8 string to bytes. */
export function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Decode bytes to a UTF-8 string. */
export function decodeUtf8(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}
