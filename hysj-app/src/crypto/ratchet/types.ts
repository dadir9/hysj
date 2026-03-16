/** Serializable Double Ratchet state — stored per conversation. */
export interface RatchetState {
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array;
  receivingChainKey: Uint8Array;
  dhSendSecret: Uint8Array;
  dhSendPublic: Uint8Array;
  dhReceivePublic: Uint8Array;
  sendingIndex: number;
  receivingIndex: number;
  previousSendingLength: number;
  /** Skipped message keys for out-of-order messages. Key = base64(dhPub):index */
  skippedKeys: Record<string, Uint8Array>;
}

export interface MessageHeader {
  dhPublic: Uint8Array;   // sender's current DH ratchet public key
  messageIndex: number;
  previousChainLength: number;
}

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  header: MessageHeader;
}
