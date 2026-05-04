# Threat Model

## Overview

Hysj is a zero-storage encrypted messenger designed so that the server never has access to message content, cannot identify senders, and retains no message history. This document describes the cryptographic protocols used, what threats Hysj protects against, and the known limitations.

## Cryptographic Protocols

### X3DH (Extended Triple Diffie-Hellman)

Used for initial key agreement between two parties who may not be online simultaneously. Each user registers identity keys and a set of pre-keys on the server. When Alice wants to message Bob, she fetches Bob's pre-key bundle and performs the X3DH handshake to derive a shared secret -- without Bob needing to be online.

### Double Ratchet

After X3DH establishes the initial shared secret, the Double Ratchet protocol takes over. It combines a Diffie-Hellman ratchet (new DH keys exchanged with every message) and a symmetric-key ratchet (KDF chain) to provide forward secrecy and post-compromise security. Every message uses a unique encryption key; compromising one key reveals nothing about past or future messages.

### XChaCha20-Poly1305

All message payloads are encrypted with XChaCha20-Poly1305, an AEAD cipher providing both confidentiality and integrity. The extended 24-byte nonce eliminates nonce-reuse concerns.

### HKDF-SHA256

Key derivation throughout the protocol stack uses HKDF with SHA-256 as the underlying hash. This is used in X3DH output expansion, Double Ratchet chain key derivation, and Sealed Sender key derivation.

### Sealed Sender

The sender's identity is encrypted within the message envelope so that the server cannot determine who sent a message. The server sees only the recipient identifier and an opaque encrypted blob. Sender identity is revealed only to the intended recipient upon decryption.

### 3-Hop Onion Routing

Messages can be routed through a 3-hop onion relay chain. Each hop peels one layer of encryption, forwarding the message to the next relay. No single relay knows both the sender and the recipient. This mitigates traffic analysis by network observers and a compromised server.

### ML-KEM-768 (Post-Quantum Hybrid)

A hybrid key exchange combining classical X25519 with ML-KEM-768 (formerly CRYSTALS-Kyber). The combined shared secret ensures that even if a quantum computer breaks the classical key exchange in the future, past sessions remain secure.

## What We Protect Against

### Passive network eavesdroppers
All communication is end-to-end encrypted. An attacker intercepting network traffic sees only encrypted blobs. TLS protects the transport layer; E2EE protects the message layer.

### Compromised server
The server is a blind relay. It stores only users, devices, and cryptographic public keys -- never messages, conversations, or plaintext. Messages exist briefly in Redis (encrypted) and are deleted on delivery or after a 72-hour TTL. Even with full server access, an attacker learns nothing about message content or sender identity.

### Traffic analysis
Onion routing through a 3-hop relay chain prevents the server from correlating senders and recipients by IP address. No single node in the relay chain knows both endpoints.

### Sender identity exposure
Sealed Sender ensures the server cannot see who sent a message. The sender's identity is encrypted within the message and is only visible to the recipient.

### Future quantum attacks
The ML-KEM-768 hybrid key exchange provides post-quantum security. Even if a quantum computer compromises X25519 in the future, the ML-KEM component protects previously exchanged keys.

### Forward secrecy compromise
The Double Ratchet generates a new encryption key for every message. Compromising a single message key does not expose past or future messages.

## What We Do NOT Protect Against

### Compromised end device
If an attacker has full access to a user's device (physical access, malware, remote exploit), they can read decrypted messages, extract keys, and impersonate the user. Hysj is not designed to protect against a compromised endpoint.

### Rubber-hose cryptanalysis
Hysj cannot protect users who are coerced into revealing their credentials or decrypted messages through physical threats or legal compulsion.

### Timing and frequency metadata
While onion routing mitigates IP-based correlation, an attacker observing global traffic patterns may still infer communication relationships from message timing and frequency. This is partially mitigated but not fully eliminated.

### Social engineering
If a user is tricked into adding a malicious contact or revealing their credentials, Hysj cannot prevent the resulting compromise.

### Malicious app updates
If a user installs a compromised version of the Hysj app, all security guarantees are void. Hysj does not currently implement reproducible builds or binary transparency.

## Trust Assumptions

1. **Device integrity** -- The user's device is not compromised and runs a genuine copy of the Hysj app.
2. **App binary integrity** -- The installed app has not been tampered with.
3. **Initial key exchange** -- The initial X3DH key exchange is not subject to a man-in-the-middle attack. (Future work: safety numbers / key verification.)
4. **Cryptographic primitives** -- The underlying cryptographic algorithms (X25519, XChaCha20-Poly1305, ML-KEM-768, SHA-256) are secure as currently understood.

## Server Trust Model

The server operates on a **zero-trust** model:

- The server is a blind relay. It forwards encrypted blobs without understanding their contents.
- The server never stores plaintext messages, conversation metadata, or social graphs.
- Messages are stored in Redis only until delivery (or 72 hours, whichever comes first).
- Redis is configured with `save ""` and `appendonly no` -- zero disk persistence.
- Even a fully compromised server reveals nothing about message content or sender identity.

## Key Management

- **Identity keys** -- Long-term Ed25519 key pairs. Persist on the user's device. The public key is uploaded to the server during registration.
- **Pre-keys** -- One-time-use Diffie-Hellman keys uploaded in batches. Consumed during X3DH. The client replenishes pre-keys periodically.
- **Signed pre-key** -- A medium-term DH key signed by the identity key. Rotated periodically.
- **Session keys** -- Derived via the Double Ratchet. Ratcheted forward with every message. Never stored on the server.
- **Kyber keys** -- ML-KEM-768 public keys registered per device for hybrid post-quantum key exchange.

All private key material is stored only on the user's device and is zeroized from memory after use.

## Known Limitations and Future Work

- **No safety numbers** -- Users cannot currently verify each other's identity keys out-of-band. This makes the system vulnerable to server-side MITM during initial key exchange. Planned: QR-code-based safety number verification.
- **No reproducible builds** -- Users cannot verify that the distributed app binary matches the source code. Planned for a future release.
- **Limited metadata protection** -- While Sealed Sender and Onion Routing provide strong metadata protection, sophisticated global adversaries may still correlate traffic patterns.
- **Single-device key storage** -- Keys are stored only on the device. Device loss means loss of message history. Planned: encrypted key backup.
- **No formal audit** -- The cryptographic implementation has not been formally audited by a third party. Planned when funding permits.
