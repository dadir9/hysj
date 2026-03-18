# Hysj Team Analysis Report
**Dato:** 2026-03-18
**Sesjon:** Full 5-agent kodebase-analyse

---

## Frontend Agent

### Sterkt
- Konsistent mork tema med lilla aksent (#7C3AED)
- ChatScreen: typing-indikatorer, delivery-statuser, date separators, retry-logikk
- LoginScreen har gode accessibility-labels

### Funn
- **LoginScreen hardkoder farger** (`'#2D2D3A'`, `'#353545'`) i stedet for `colors.bg` / `colors.bgSurface` fra theme.ts — `LoginScreen.tsx:302-303`
- **COUNTRIES-liste duplisert** identisk i LoginScreen og RegisterScreen (50+ land) — bor ekstraheres til shared constant
- **RegisterScreen mangler accessibility-labels** pa input-feltene
- **ChatScreen `onChangeText` bruker `setText` direkte** i stedet for `handleTextChange` — typing-indikatorer sendes aldri — `ChatScreen.tsx:464`
- **ConversationListScreen ReceiveMessage signatur-mismatch** — ChatHub sender objekt `{ messageId, encryptedBlob }`, men handler forventer to separate strings — `ConversationListScreen.tsx:63`

---

## Backend Agent

### Sterkt
- Null-lagring: Ingen Messages/Conversations-tabell. Redis med TTL. `StringGetDeleteAsync` for atomisk henting+sletting
- Argon2id med korrekte parametere (4 parallellitet, 64MB, 3 iterasjoner) + constant-time sammenligning
- Ed25519 SignedPreKey-verifisering ved registrering
- TOTP-hemmeligheter kryptert med AES-256-GCM
- JWT: 64-byte minimum hemmelighet, full validering

### Funn
- **Rate limiting dekker KUN `/api/auth/login`** — meldinger (60/min), registrering (3/time/IP), wipe (3/time), prekeys (30/min) mangler — `RateLimitMiddleware.cs:15-16`
- **NoLogMiddleware gjor nesten ingenting** — bare kaller `EnableBuffering()`, filtrerer ikke faktisk logging — `NoLogMiddleware.cs`
- **ChatHub typing-indikator lekker userId** — sender `userId` til mottaker, bryter Sealed Sender-prinsippet — `ChatHub.cs:107-114`
- **Static ConcurrentDictionary for online-status** — fungerer ikke med scale-out — `ChatHub.cs:16`
- **WipeService bruker `Clients.User(deviceId)`** — deviceId er ikke userId, wipe-kommandoer leveres aldri — `WipeService.cs:33`
- **Ingen refresh token opprydding** — revoked/utlopte tokens slettes aldri fra DB — `HysjDbContext.cs:83-96`
- **Login bruker kun forste enhet** — `user.Devices.FirstOrDefault()`, ingen multi-device stotte — `AuthService.cs:99-100`
- **DateTime i JWT-generering** — bruker `DateTime.UtcNow` i stedet for `DateTimeOffset.UtcNow` — `AuthService.cs:325`

---

## Research Agent

### Krypto-stack kvalitet
- **X3DH:** Korrekt med 4 DH-operasjoner + ML-KEM-768 hybrid. `zeroMemory()` nullstiller intermediate secrets
- **Double Ratchet:** Signal-kompatibel. KDF-kjeder, skipped keys (maks 1000), constant-time key-sammenligning
- **XChaCha20-Poly1305:** 24-byte nonce, korrekt nonce||ciphertext+tag format
- **ML-KEM-768 (FIPS 203):** Reelle nokkelstorrelser (1184 pk, 2400 sk, 1088 ct, 32 ss)

### Funn
- **Sealed Sender ikke integrert** — `sealedSender.ts` har `seal()`/`unseal()` men chatHub.ts bruker dem aldri. Server ser `RecipientDeviceId` i klartekst
- **Onion Routing ikke integrert** — `onionRouter.ts`/`onionLayer.ts` finnes men brukes aldri. Ingen relay-server
- **Master key i plaintext AsyncStorage** — `__hysj_mk__` lagret som base64 i AsyncStorage (SQLite uten kryptering pa Android). Bor bruke `expo-secure-store` — `secureStorage.ts:38-49`
- **Legacy plaintext blob fallback** — `decodeLegacyBlob` aksepterer ukrypterte JSON-blobs, lar server injisere falske meldinger — `chatHub.ts:251-257`
- **Sender Certificate API** eksisterer men brukes aldri av frontend

---

## Fullstack Developer

### Frontend <-> Backend Alignment
- **DTO/Type alignment for register:** Backend forventer `byte[]` (base64 i JSON), frontend sender `string` (base64) — fungerer korrekt via JSON-deserialisering
- **LoginScreen lagrer IKKE refreshToken/expiresAt** fra login-respons — token-refresh vil aldri fungere — `LoginScreen.tsx:96-101`
- **ConversationListScreen vs ChatHub signatur:** Hub sender ETT objekt, handler forventer TO argumenter — meldinger mottas aldri pa samtale-listen
- **To parallelle wipe-mekanismer:** ChatHub.SendWipeCommand (korrekt routing) vs WipeService.IssueWipeAsync (feil routing). Klienten bruker REST -> WipeController -> WipeService-banen som har feilen

---

## Report Agent — Prioritert Plan

### P1 — Kritisk

| # | Funn | Fil | Linje |
|---|------|-----|-------|
| 1 | LoginScreen lagrer ikke refreshToken/expiresAt | LoginScreen.tsx | 96-101 |
| 2 | ConversationListScreen ReceiveMessage signatur-mismatch | ConversationListScreen.tsx | 63 |
| 3 | Rate limiting dekker kun login | RateLimitMiddleware.cs | 15-16 |
| 4 | WipeService SignalR routing feil | WipeService.cs | 33 |
| 5 | ChatScreen setText vs handleTextChange | ChatScreen.tsx | 464 |

### P2 — Viktig

| # | Funn |
|---|------|
| 6 | Sealed Sender ikke integrert i meldingsflyten |
| 7 | Onion Routing ikke integrert, ingen relay-server |
| 8 | Master key i plaintext AsyncStorage |
| 9 | NoLogMiddleware gjor ingenting |
| 10 | Typing-indikator lekker userId |
| 11 | Legacy plaintext blob fallback |
| 12 | Login velger kun forste enhet |
| 13 | Ingen refresh token opprydding |
| 14 | Static ConcurrentDictionary for online-status |

### P3 — Forbedringer

| # | Funn |
|---|------|
| 15 | COUNTRIES-liste duplisert |
| 16 | LoginScreen hardkodede farger |
| 17 | RegisterScreen mangler accessibility-labels |
| 18 | DateTime vs DateTimeOffset i JWT |
| 19 | Sender Certificate ubrukt |

### Anbefalt Rekkefolge
1. Fiks P1-1 og P1-2 — appen er ikke funksjonell uten disse
2. Fiks P1-4 (WipeService routing) — kritisk sikkerhetsfunksjon
3. Implementer full rate limiting (P1-3)
4. Integrer Sealed Sender (P2-6) — kjerne-differensiator
5. Flytt master key til OS keychain (P2-8)
6. Fjern legacy blob fallback (P2-11)
