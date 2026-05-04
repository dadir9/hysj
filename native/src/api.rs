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

// ── Sealed Sender ─────────────────────────────────────────────────────

/// Seal a message with sealed-sender encryption.
/// Hides the sender identity from the server.
/// Returns sealed_b64.
pub fn sealed_sender_seal(
    plaintext_b64: String,
    sender_id: String,
    sender_cert_b64: String,
    recipient_identity_public_b64: String,
) -> Result<String, String> {
    let plaintext = B64.decode(&plaintext_b64).map_err(|e| e.to_string())?;
    let sender_cert = B64.decode(&sender_cert_b64).map_err(|e| e.to_string())?;
    let recipient = B64.decode(&recipient_identity_public_b64).map_err(|e| e.to_string())?;

    let sealed = hysj_crypto::sealed::seal(&plaintext, &sender_id, &sender_cert, &recipient)
        .map_err(|e| e.to_string())?;

    Ok(B64.encode(sealed))
}

/// Open a sealed-sender message.
/// Returns (sender_id, sender_cert_b64, plaintext_b64).
pub fn sealed_sender_open(
    sealed_b64: String,
    our_identity_secret_b64: String,
    cert_verification_key_b64: String,
) -> Result<(String, String, String), String> {
    let sealed = B64.decode(&sealed_b64).map_err(|e| e.to_string())?;
    let our_sk = B64.decode(&our_identity_secret_b64).map_err(|e| e.to_string())?;
    let cert_vk = B64.decode(&cert_verification_key_b64).map_err(|e| e.to_string())?;

    let content =
        hysj_crypto::sealed::open(&sealed, &our_sk, &cert_vk).map_err(|e| e.to_string())?;

    Ok((
        content.sender_id,
        B64.encode(&content.sender_certificate),
        B64.encode(&content.plaintext),
    ))
}

// ── Onion Routing ─────────────────────────────────────────────────────

/// Wrap a payload in onion encryption layers for the given route.
/// Each route entry is (address, public_key_b64).
/// Returns onion_b64.
pub fn onion_wrap(
    route_addresses: Vec<String>,
    route_public_keys_b64: Vec<String>,
    plaintext_b64: String,
) -> Result<String, String> {
    if route_addresses.len() != route_public_keys_b64.len() {
        return Err("route_addresses and route_public_keys_b64 must have the same length".into());
    }

    let route: Result<Vec<hysj_crypto::onion::RelayNode>, String> = route_addresses
        .into_iter()
        .zip(route_public_keys_b64)
        .map(|(addr, pk_b64)| {
            let pk = B64.decode(&pk_b64).map_err(|e| e.to_string())?;
            Ok(hysj_crypto::onion::RelayNode {
                address: addr,
                public_key: pk,
            })
        })
        .collect();
    let route = route?;

    let plaintext = B64.decode(&plaintext_b64).map_err(|e| e.to_string())?;

    let onion =
        hysj_crypto::onion::wrap_onion(&plaintext, &route).map_err(|e| e.to_string())?;

    Ok(B64.encode(onion))
}

/// Unwrap one onion layer using our private key.
/// Returns (next_hop, payload_b64).
pub fn onion_unwrap_layer(
    onion_b64: String,
    our_secret_b64: String,
) -> Result<(String, String), String> {
    let onion = B64.decode(&onion_b64).map_err(|e| e.to_string())?;
    let our_sk = B64.decode(&our_secret_b64).map_err(|e| e.to_string())?;

    let layer =
        hysj_crypto::onion::unwrap_layer(&onion, &our_sk).map_err(|e| e.to_string())?;

    Ok((layer.next_hop, B64.encode(&layer.payload)))
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

/// Perform X3DH key agreement as responder.
/// Returns shared_secret_b64.
pub fn x3dh_respond(
    our_identity_secret_b64: String,
    our_signed_pre_key_secret_b64: String,
    our_one_time_pre_key_secret_b64: Option<String>,
    our_kyber_secret_b64: String,
    their_identity_public_b64: String,
    their_ephemeral_public_b64: String,
    kyber_ciphertext_b64: String,
) -> Result<String, String> {
    let our_ik = B64.decode(&our_identity_secret_b64).map_err(|e| e.to_string())?;
    let our_spk = B64.decode(&our_signed_pre_key_secret_b64).map_err(|e| e.to_string())?;
    let our_opk = our_one_time_pre_key_secret_b64
        .map(|s| B64.decode(&s).map_err(|e| e.to_string()))
        .transpose()?;
    let our_kyber = B64.decode(&our_kyber_secret_b64).map_err(|e| e.to_string())?;
    let their_ik = B64.decode(&their_identity_public_b64).map_err(|e| e.to_string())?;
    let their_eph = B64.decode(&their_ephemeral_public_b64).map_err(|e| e.to_string())?;
    let kyber_ct = B64.decode(&kyber_ciphertext_b64).map_err(|e| e.to_string())?;

    let shared_secret = hysj_crypto::x3dh::x3dh_respond(
        &our_ik,
        &our_spk,
        our_opk.as_deref(),
        &our_kyber,
        &their_ik,
        &their_eph,
        &kyber_ct,
    )
    .map_err(|e| e.to_string())?;

    Ok(B64.encode(&shared_secret))
}
