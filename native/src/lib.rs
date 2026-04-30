//! Hysj Native Bridge — exposes crypto functions to Flutter via flutter_rust_bridge.
//!
//! This crate wraps hysj-crypto so Flutter can call:
//! - X3DH key agreement
//! - Double Ratchet encrypt/decrypt
//! - XChaCha20-Poly1305 AEAD
//! - Sealed Sender wrapping
//!
//! All functions operate on base64-encoded byte arrays for easy FFI.

pub mod api;
