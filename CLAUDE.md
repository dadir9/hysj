# CLAUDE.md — Hysj

> Null-lagring meldingsapp. Ingenting blir lagret. Alt slettes etter levering. Remote wipe fra hvilken som helst enhet.
>
> **Backend: C# 12 / .NET 8 / ASP.NET Core Web API** | **Frontend: React Native / Expo ~55 / TypeScript**

---

## Kjerneprinsipp

**Serveren er en blind, midlertidig postboks.** Den mottar krypterte meldinger, leverer dem, og sletter alt umiddelbart. Ingen historikk. Ingen metadata. Ingen spor.

Meldinger lever KUN på avsender og mottakerens enheter — og selv der kan de fjernslettes fra en annen enhet.

---

## Prosjektstruktur

```
Hysj/
│
├── src/
│   ├── Hysj.Api/                         # ASP.NET Core Web API (backend)
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs          # Registrering, login, 2FA
│   │   │   ├── KeysController.cs          # Offentlige nokler, pre-keys
│   │   │   ├── DevicesController.cs       # Enhetshåndtering
│   │   │   ├── GroupsController.cs        # Gruppechat
│   │   │   ├── WipeController.cs          # Remote wipe-kommandoer
│   │   │   ├── RelayController.cs         # Onion relay-noder
│   │   │   └── UsersController.cs         # Brukeroppslag
│   │   │
│   │   ├── Hubs/
│   │   │   └── ChatHub.cs                 # SignalR Hub: meldinger + wipe
│   │   │
│   │   ├── Services/
│   │   │   ├── AuthService.cs             # Autentisering + Argon2id
│   │   │   ├── MessageQueueService.cs     # Redis midlertidig ko
│   │   │   └── WipeService.cs             # Remote wipe-distribusjon
│   │   │
│   │   ├── Models/
│   │   │   ├── User.cs, Device.cs, PreKey.cs, LoginAttempt.cs
│   │   │   ├── Group.cs, GroupMember.cs
│   │   │
│   │   ├── DTOs/                          # Request/Response records
│   │   ├── Data/HysjDbContext.cs          # EF Core DbContext
│   │   ├── Middleware/                    # RateLimit, NoLog
│   │   ├── BackgroundServices/            # MessageExpiry, WipePending
│   │   └── Migrations/
│   │
│   └── Hysj.Shared/                      # Class Library (delte modeller)
│
├── hysj-app/                              # React Native / Expo (frontend)
│   ├── App.tsx                            # Entry point
│   ├── app.json                           # Expo-konfigurasjon
│   ├── package.json
│   ├── src/
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx           # Stack navigator (8 skjermer)
│   │   │
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   ├── ConversationListScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── NewChatScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── SecurityScreen.tsx
│   │   │   └── CreateGroupScreen.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                     # Axios REST-klient (auth, keys, devices, groups, wipe, relay, users)
│   │   │   ├── chatHub.ts                 # SignalR-tilkobling + Double Ratchet kryptering
│   │   │   ├── auth.ts                    # Session-håndtering (AsyncStorage)
│   │   │   ├── config.ts                  # BASE_URL / HUB_URL
│   │   │   ├── keyManager.ts              # Nokkelgenerering og -lagring
│   │   │   ├── sessionManager.ts          # Ratchet session-opprett
│   │   │   ├── localStore.ts              # Lokal meldingslagring
│   │   │   ├── wipeService.ts             # Lokal wipe-handtering
│   │   │   ├── notifications.ts           # Push-varslinger (expo-notifications)
│   │   │   └── locale.ts                  # Lokalisering
│   │   │
│   │   ├── crypto/                        # Ende-til-ende kryptografi
│   │   │   ├── index.ts                   # Re-eksporter alt
│   │   │   ├── keys.ts                    # X25519 nokkelpar (tweetnacl)
│   │   │   ├── cipher.ts                  # XChaCha20-Poly1305 (@stablelib)
│   │   │   ├── kdf.ts                     # HKDF-SHA256, HMAC-SHA256
│   │   │   ├── encoding.ts                # Base64, UTF-8
│   │   │   ├── x3dh/x3dh.ts              # Extended Triple Diffie-Hellman
│   │   │   ├── ratchet/doubleRatchet.ts   # Double Ratchet Protocol
│   │   │   ├── ratchet/serialize.ts       # Ratchet state serialisering
│   │   │   ├── sealed/sealedSender.ts     # Anonym avsender
│   │   │   ├── onion/onionLayer.ts        # Onion-krypteringslag
│   │   │   ├── onion/onionRouter.ts       # 3-hop relay-ruting
│   │   │   ├── postquantum/kyberKem.ts    # ML-KEM-768 (FIPS 203)
│   │   │   └── postquantum/hybridKeyExchange.ts  # Hybrid X25519 + ML-KEM
│   │   │
│   │   ├── constants/
│   │   │   └── theme.ts                   # Farger, spacing, radius, fonts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript-typer + RootStackParamList
│   │   │
│   │   ├── components/                    # Gjenbrukbare UI-komponenter
│   │   └── hooks/
│   │
│   └── assets/                            # Ikoner, splash
│
├── tests/
│   ├── Hysj.Api.Tests/                   # xUnit backend-tester
│   └── Hysj.Crypto.Tests/               # Kryptografi-tester (28 tester)
│
├── Hysj.sln
├── CLAUDE.md
└── .editorconfig
```

---

## Kommandoer

### Backend (ASP.NET Core)
```bash
# Kjor backend-server
dotnet run --project src/Hysj.Api

# Build
dotnet build

# Kjor tester
dotnet test

# EF Core migrasjoner
dotnet ef migrations add <Navn> --project src/Hysj.Api
dotnet ef database update --project src/Hysj.Api
```

### Frontend (React Native / Expo)
```bash
cd hysj-app

npm start              # Expo dev server
npm run android        # Android emulator
npm run ios            # iOS simulator
npm run web            # Nettleser
```

---

## Teknisk Stack

| Komponent | Teknologi |
|-----------|-----------|
| **Backend** | |
| API | ASP.NET Core 8 Web API (C# 12) |
| Sanntid | SignalR (WebSocket) |
| Midlertidig ko | Redis (in-memory, ingen disk) |
| Database | PostgreSQL via EF Core 8 |
| Autentisering | JWT Bearer + TOTP 2FA |
| Passord-hashing | Argon2id |
| Rate-limiting | AspNetCoreRateLimit |
| Testing | xUnit + FluentAssertions + Testcontainers |
| **Frontend** | |
| Framework | React Native 0.83 / Expo ~55 |
| Sprak | TypeScript ~5.9 (strict) |
| Navigasjon | React Navigation (Stack) |
| HTTP | Axios |
| Sanntid | @microsoft/signalr |
| Lokal lagring | AsyncStorage |
| Krypto-primitiver | tweetnacl, @stablelib/x25519, @stablelib/xchacha20poly1305, @stablelib/hkdf |
| Post-kvantum | mlkem (ML-KEM-768 / FIPS 203) |
| Push-varslinger | expo-notifications |

---

## Frontend — React Native / Expo

### Navigasjonsstruktur (Stack Navigator)

```
Login → Register
  ↓
ConversationList → Chat
                 → NewChat
                 → CreateGroup
                 → Settings → Security
```

### API-tilkobling

Konfigurert i `hysj-app/src/services/config.ts`:
```
Android emulator: http://10.0.2.2:5076
iOS / Web:        http://localhost:5076
```

Alle API-kall gar gjennom Axios med automatisk JWT-token fra AsyncStorage.

### Kryptografi-lag (hysj-app/src/crypto/)

| Protokoll | Bibliotek | Beskrivelse |
|-----------|-----------|-------------|
| X25519 | tweetnacl | Diffie-Hellman nokkelutveksling |
| XChaCha20-Poly1305 | @stablelib | Autentisert kryptering (24-byte nonce) |
| HKDF-SHA256 | @stablelib | Nokkelavledning |
| X3DH | Egen impl. | Signal-kompatibel handshake |
| Double Ratchet | Egen impl. | Forward secrecy per melding |
| Sealed Sender | Egen impl. | Server-blind avsenderidentitet |
| Onion Routing | Egen impl. | 3-hop relay |
| ML-KEM-768 | mlkem | Post-kvantum hybrid nokkelutveksling |

### Meldingsflyt (klient)

1. **Registrering**: Generer X25519 identitetsnokkler + SignedPreKey + OneTimePreKeys + ML-KEM nokkelpar
2. **Ny samtale**: X3DH handshake med mottakers PreKey-bunt → initialiser Double Ratchet
3. **Send melding**: `ratchetEncrypt()` → base64 wire-format → SignalR `SendMessage`
4. **Motta melding**: SignalR `ReceiveMessage` → `ratchetDecrypt()` → vis i chat
5. **Ratchet state**: Persisteres i AsyncStorage per samtale

### TypeScript-typer (hysj-app/src/types/)

```typescript
User, Conversation, Message, AuthSession, RootStackParamList
```

### Tema (hysj-app/src/constants/theme.ts)

Mork tema med lilla aksent (#7C3AED). Eksporterer `colors`, `spacing`, `radius`, `font`.

---

## Backend — ASP.NET Core

### NuGet-pakker (Hysj.Api)
```
Microsoft.AspNetCore.SignalR.Core
Microsoft.AspNetCore.Authentication.JwtBearer          8.*
Microsoft.EntityFrameworkCore                          8.*
Microsoft.EntityFrameworkCore.Tools                    8.*
Npgsql.EntityFrameworkCore.PostgreSQL                  8.*
StackExchange.Redis                                    2.*
Konscious.Security.Cryptography.Argon2                 1.*
AspNetCoreRateLimit                                    5.*
Otp.NET                                                1.*
```

### Kodekonvensjoner (C#)
- C# 12 med `file-scoped namespaces`
- `nullable enable` i alle prosjekter
- `ImplicitUsings enable`
- Interface for alle services (`IMessageQueueService` → `MessageQueueService`)
- `record` for DTOs, `class` for EF Core-modeller
- `DateTimeOffset` (ikke `DateTime`) for alle tidsstempler

### Navngivning
```
PascalCase:    Klasser, metoder, properties, enums
camelCase:     Lokale variabler, parametere
_camelCase:    Private felt
I-prefix:      Interfaces (IMessageQueueService)
Async-suffix:  Async metoder (SendMessageAsync)
```

---

## Arkitektur: Null-Lagring

```
AVSENDER                    SERVER                     MOTTAKER
   |                          |                           |
   |  Krypterer melding       |                           |
   |  (XChaCha20-Poly1305     |                           |
   |   via Double Ratchet)    |                           |
   |                          |                           |
   |---- Sender kryptert ---->|                           |
   |     blob via SignalR     |                           |
   |                          |                           |
   |                    Mottaker online?                   |
   |                     JA   |   NEI                     |
   |                     |    |    |                      |
   |                     |    |    -- Legg i Redis        |
   |                     |    |       (maks 72 timer,     |
   |                     |    |        ingen disk)        |
   |                     |    |                           |
   |                     v    v                           |
   |              Lever til mottaker -------------------->|
   |                          |                           |
   |                    SLETT UMIDDELBART                  |
   |                    fra server-minne                  |
```

---

## Tre Slette-Mekanismer

### 1. Auto-slett etter levering (server)
- Melding levert → slett fra Redis UMIDDELBART
- Mottaker sender `DeliveryAck` → serveren verifiserer sletting
- Bakgrunnsjobb feier Redis hvert 5. minutt

### 2. TTL-utlop for uleverte meldinger (server)
- Mottaker offline → melding i Redis med TTL 72 timer
- Etter 72 timer: Redis sletter automatisk
- Avsender far varsel: "Meldingen utlop"

### 3. Remote Wipe (klient-til-klient via server)

| Type | Hva slettes | Brukstilfelle |
|------|------------|---------------|
| `WipeType.Conversation` | En samtale pa alle enheter | Slett chat med en person |
| `WipeType.Device` | Alt pa en spesifikk enhet | Mistet telefon |
| `WipeType.All` | Alt pa ALLE enheter | Nodssituasjon |

---

## Database-modell (PostgreSQL + EF Core)

**VIKTIG: Databasen lagrer ALDRI meldinger. Kun brukere, enheter og nokler.**

Tabeller: `Users`, `Devices`, `PreKeys`, `LoginAttempts`, `Groups`, `GroupMembers`

Ingen `Messages`-tabell. Ingen `Conversations`-tabell. Ingen `Attachments`-tabell.

---

## Redis-konfigurasjon (Null Disk)

```
save ""
appendonly no
maxmemory 512mb
maxmemory-policy allkeys-lru
```

Nokkelstruktur:
```
msg:{recipientDeviceId}:{messageId}     → kryptert blob    TTL: 72 timer
wipe:{targetDeviceId}:{wipeId}          → wipe-kommando    TTL: 30 dager
```

---

## Sikkerhetskonfigurasjon

### Rate-limiting:
```
Login:           5 forsok / 15 min / IP → las 30 min
Meldinger:       60 / min / bruker
Wipe:            3 / time / bruker (+ krever 2FA)
PreKey-henting:  30 / min / bruker
Registrering:    3 / time / IP
```

### Hva serveren ALDRI gjor:
- Lagrer meldingsinnhold
- Lagrer meldingsmetadata (hvem → hvem)
- Logger meldingsinnhold
- Logger IP lenger enn 24 timer
- Beholder data etter levering
- Tar backup av Redis
- Har tilgang til krypteringsnokkler

---

## Teststrategi

### Backend (xUnit — `dotnet test`)
- MessageQueueTests: Meldinger i Redis-ko
- WipeServiceTests: Remote wipe-distribusjon
- ExpiryTests: Uleverte meldinger utloper
- RateLimitTests: Brute force-beskyttelse

### Kryptografi (xUnit — 28 tester)
- AesGcmTests, DoubleRatchetTests, OnionRoutingTests, SealedSenderTests, WipeTests

---

## Docker Compose

```yaml
services:
  hysj-api:
    build:
      context: .
      dockerfile: src/Hysj.Api/Dockerfile
    ports:
      - "5076:8080"
    depends_on:
      redis:
        condition: service_started
      postgres:
        condition: service_healthy
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__Postgres=Host=postgres;Database=hysj;Username=hysj;Password=${DB_PASSWORD}
      - ConnectionStrings__Redis=redis:6379
      - Jwt__Secret=${JWT_SECRET}

  redis:
    image: redis:7-alpine
    command: redis-server --save "" --appendonly no --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: hysj
      POSTGRES_USER: hysj
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hysj"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```
