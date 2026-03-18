---
name: Full codebase audit March 2026
description: Comprehensive 5-agent analysis of Hysj project state — security, frontend, backend, crypto, fullstack integration findings
type: project
---

## Audit Date: 2026-03-18

### Feature completeness
- Backend: Auth (register/login/2FA/refresh), Keys, Devices, Groups, Wipe, Relay, Users, ChatHub — all implemented
- Frontend: 8 screens (Login, Register, ConversationList, Chat, NewChat, Settings, Security, CreateGroup)
- Crypto: X3DH, Double Ratchet, Sealed Sender, Onion Routing, ML-KEM-768 — all implemented in TypeScript
- Tests: xUnit backend tests (MessageQueue, WipeService, Expiry, RateLimit) + crypto tests (28 tests)

### Critical findings
- P1: Rate limiting only covers /api/auth/login — messages, registration, wipe, prekey-fetch have NO rate limiting
- P1: LoginScreen saves phone number as username — no actual username collected on login
- P1: `saveSession` in LoginScreen does not save refreshToken or expiresAt
- P1: ChatHub typing indicator leaks userId to server (metadata)
- P2: NoLogMiddleware is incomplete — only enables request buffering, does not actually suppress logging
- P2: Master key stored in plain AsyncStorage — should use expo-secure-store or OS keychain
- P2: ConversationListScreen ReceiveMessage handler signature mismatch (expects 2 args but ChatHub sends object)
- P2: Sealed Sender and Onion Routing implemented but NOT integrated into the actual message send/receive flow
- P3: COUNTRIES list duplicated in LoginScreen and RegisterScreen
- P3: No expired refresh token cleanup mechanism
