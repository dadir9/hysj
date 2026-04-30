use base64::{engine::general_purpose::STANDARD as B64, Engine};

// ── Key Generation ──────────────────────────────────────────────────────

/// Generate a new X25519 keypair. Returns (private_key_b64, public_key_b64).
pub fn generate_x25519_keypair() -> (String, String) {
    let kp = hysj_crypto::keys::generate_x25519_keypair();
    let secret_bytes: [u8; 32] = kp.secret.to_bytes();
    let public_bytes: Vec<u8> = kp.public.as_bytes().to_vec();
    (B64.encode(secret_bytes), B64.encode(public_bytes))
}

/// Generate a new Ed25519 signing keypair. Returns (secret_b64, public_key_b64).
pub fn generate_ed25519_keypair() -> (String, String) {
    let kp = hysj_crypto::keys::generate_ed25519_keypair();
    (
        B64.encode(kp.signing_key.to_bytes()),
        B64.encode(kp.verifying_key.as_bytes()),
    )
}

// ── XChaCha20-Poly1305 AEAD ─────────────────────────────────────────────

/// Encrypt plaintext with XChaCha20-Poly1305.
/// Returns ciphertext_b64 (nonce || ciphertext || tag).
pub fn encrypt_aead(key_b64: String, plaintext_b64: String) -> Result<String, String> {
    let key = B64.decode(&key_b64).map_err(|e| e.to_string())?;
    let plaintext = B64.decode(&plaintext_b64).map_err(|e| e.to_string())?;

    let key_arr: [u8; 32] = key
        .try_into()
        .map_err(|_| "Key must be 32 bytes".to_string())?;

    let ciphertext =
        hysj_crypto::cipher::encrypt(&plaintext, &key_arr, &[]).map_err(|e| e.to_string())?;

    Ok(B64.encode(ciphertext))
}

/// Decrypt ciphertext with XChaCha20-Poly1305.
/// Expects nonce || ciphertext || tag.
pub fn decrypt_aead(key_b64: String, ciphertext_b64: String) -> Result<String, String> {
    let key = B64.decode(&key_b64).map_err(|e| e.to_string())?;
    let ciphertext = B64.decode(&ciphertext_b64).map_err(|e| e.to_string())?;

    let key_arr: [u8; 32] = key
        .try_into()
        .map_err(|_| "Key must be 32 bytes".to_string())?;

    let plaintext =
        hysj_crypto::cipher::decrypt(&ciphertext, &key_arr, &[]).map_err(|e| e.to_string())?;

    Ok(B64.encode(plaintext))
}

// ── HKDF Key Derivation ─────────────────────────────────────────────────

/// Derive a key using HKDF-SHA256. Returns derived_key_b64 (32 bytes).
pub fn hkdf_derive(
    input_key_b64: String,
    salt_b64: String,
    info: String,
) -> Result<String, String> {
    let ikm = B64.decode(&input_key_b64).map_err(|e| e.to_string())?;
    let salt = B64.decode(&salt_b64).map_err(|e| e.to_string())?;

    let derived = hysj_crypto::kdf::hkdf_derive(&ikm, &salt, info.as_bytes(), 32);
    Ok(B64.encode(derived))
}

// ── Double Ratchet ──────────────────────────────────────────────────────

/// Initialize a Double Ratchet session as the sender.
/// Returns serialized session as base64.
pub fn ratchet_init_sender(
    shared_secret_b64: String,
    remote_public_key_b64: String,
) -> Result<String, String> {
    let shared_secret = B64
        .decode(&shared_secret_b64)
        .map_err(|e| e.to_string())?;
    let remote_pk = B64
        .decode(&remote_public_key_b64)
        .map_err(|e| e.to_string())?;

    let session = hysj_crypto::ratchet::double_ratchet::RatchetState::init_sender(
        &shared_secret,
        &remote_pk,
    );

    Ok(B64.encode(session.serialize()))
}

/// Initialize a Double Ratchet session as the receiver.
/// Returns serialized session as base64.
pub fn ratchet_init_receiver(
    shared_secret_b64: String,
    our_private_key_b64: String,
    our_public_key_b64: String,
) -> Result<String, String> {
    let shared_secret = B64
        .decode(&shared_secret_b64)
        .map_err(|e| e.to_string())?;
    let our_sk = B64
        .decode(&our_private_key_b64)
        .map_err(|e| e.to_string())?;
    let our_pk = B64
        .decode(&our_public_key_b64)
        .map_err(|e| e.to_string())?;

    let session = hysj_crypto::ratchet::double_ratchet::RatchetState::init_receiver(
        &shared_secret,
        (&our_sk, &our_pk),
    );

    Ok(B64.encode(session.serialize()))
}

/// Encrypt a message using Double Ratchet.
/// Returns (updated_session_b64, header_json, ciphertext_b64).
pub fn ratchet_encrypt(
    session_b64: String,
    plaintext_b64: String,
) -> Result<(String, String, String), String> {
    let session_bytes = B64.decode(&session_b64).map_err(|e| e.to_string())?;
    let plaintext = B64.decode(&plaintext_b64).map_err(|e| e.to_string())?;

    let mut session =
        hysj_crypto::ratchet::double_ratchet::RatchetState::deserialize(&session_bytes)
            .map_err(|e| e.to_string())?;

    let (ciphertext, header) = session.encrypt(&plaintext).map_err(|e| e.to_string())?;

    let header_json = serde_json::to_string(&header).map_err(|e| e.to_string())?;

    Ok((
        B64.encode(session.serialize()),
        header_json,
        B64.encode(ciphertext),
    ))
}

/// Decrypt a message using Double Ratchet.
/// Returns (updated_session_b64, plaintext_b64).
pub fn ratchet_decrypt(
    session_b64: String,
    header_json: String,
    ciphertext_b64: String,
) -> Result<(String, String), String> {
    let session_bytes = B64.decode(&session_b64).map_err(|e| e.to_string())?;
    let ciphertext = B64.decode(&ciphertext_b64).map_err(|e| e.to_string())?;

    let mut session =
        hysj_crypto::ratchet::double_ratchet::RatchetState::deserialize(&session_bytes)
            .map_err(|e| e.to_string())?;

    let header: hysj_crypto::ratchet::header::MessageHeader =
        serde_json::from_str(&header_json).map_err(|e| e.to_string())?;

    let plaintext = session
        .decrypt(&ciphertext, &header)
        .map_err(|e| e.to_string())?;

    Ok((B64.encode(session.serialize()), B64.encode(plaintext)))
}

// ── X3DH Key Agreement ──────────────────────────────────────────────────

/// Perform X3DH key agreement as initiator.
/// Returns (shared_secret_b64, ephemeral_public_b64, kyber_ciphertext_b64).
pub fn x3dh_initiate(
    our_identity_secret_b64: String,
    our_identity_public_b64: String,
    their_identity_public_b64: String,
    their_signed_pre_key_b64: String,
    their_signed_pre_key_sig_b64: String,
    their_one_time_pre_key_b64: Option<String>,
    their_kyber_public_b64: String,
) -> Result<(String, String, String), String> {
    let our_ik_secret = B64
        .decode(&our_identity_secret_b64)
        .map_err(|e| e.to_string())?;
    let our_ik_public = B64
        .decode(&our_identity_public_b64)
        .map_err(|e| e.to_string())?;
    let their_ik = B64
        .decode(&their_identity_public_b64)
        .map_err(|e| e.to_string())?;
    let their_spk = B64
        .decode(&their_signed_pre_key_b64)
        .map_err(|e| e.to_string())?;
    let their_spk_sig = B64
        .decode(&their_signed_pre_key_sig_b64)
        .map_err(|e| e.to_string())?;
    let their_opk = their_one_time_pre_key_b64
        .map(|s| B64.decode(&s).map_err(|e| e.to_string()))
        .transpose()?;
    let their_kyber = B64
        .decode(&their_kyber_public_b64)
        .map_err(|e| e.to_string())?;

    let bundle = hysj_crypto::x3dh::PreKeyBundle {
        identity_public: their_ik,
        signed_pre_key: their_spk,
        signed_pre_key_sig: their_spk_sig,
        one_time_pre_key: their_opk,
        kyber_public: their_kyber,
    };

    let result = hysj_crypto::x3dh::x3dh_initiate(&our_ik_secret, &our_ik_public, &bundle)
        .map_err(|e| e.to_string())?;

    Ok((
        B64.encode(&result.shared_secret),
        B64.encode(&result.ephemeral_public),
        B64.encode(&result.kyber_ciphertext),
    ))
}
