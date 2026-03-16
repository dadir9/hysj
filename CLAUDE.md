# CLAUDE.md — Hysj Backend

> Null-lagring meldingsserver. Ingenting blir lagret. Alt slettes etter levering. Remote wipe fra hvilken som helst enhet.
> 
> **IDE: Visual Studio 2022** | **Stack: C# 12 / .NET 8** | **Arkitektur: ASP.NET Core Web API**

---

## Kjerneprinsipp

**Serveren er en blind, midlertidig postboks.** Den mottar krypterte meldinger, leverer dem, og sletter alt umiddelbart. Ingen historikk. Ingen metadata. Ingen spor.

Meldinger lever KUN på avsender og mottakerens enheter — og selv der kan de fjernslettes fra en annen enhet.

---

## Visual Studio 2022 — Prosjektoppsett

### Solution-struktur (.sln)

Opprett via VS2022: `File → New → Project → ASP.NET Core Web API`

```
Hysj.sln
│
├── src/
│   ├── Hysj.Api/                         # ASP.NET Core Web API
│   │   ├── Hysj.Api.csproj
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   │
│   │   ├── Properties/
│   │   │   └── launchSettings.json
│   │   │
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs          # [ApiController] Registrering, login, 2FA
│   │   │   ├── KeysController.cs          # [ApiController] Offentlige nøkler, pre-keys
│   │   │   ├── DevicesController.cs       # [ApiController] Enhetshåndtering
│   │   │   └── WipeController.cs          # [ApiController] Remote wipe-kommandoer
│   │   │
│   │   ├── Hubs/
│   │   │   └── ChatHub.cs                # SignalR Hub: meldinger + wipe
│   │   │
│   │   ├── Services/
│   │   │   ├── IMessageQueueService.cs    # Interface
│   │   │   ├── MessageQueueService.cs     # Redis midlertidig kø
│   │   │   ├── IWipeService.cs
│   │   │   ├── WipeService.cs             # Remote wipe-distribusjon
│   │   │   ├── IAuthService.cs
│   │   │   ├── AuthService.cs             # Autentisering + Argon2id
│   │   │   ├── IKeyService.cs
│   │   │   ├── KeyService.cs              # Nøkkelbunt-håndtering
│   │   │   ├── IDeviceService.cs
│   │   │   └── DeviceService.cs           # Enhetshåndtering
│   │   │
│   │   ├── Models/
│   │   │   ├── User.cs
│   │   │   ├── Device.cs
│   │   │   ├── PreKeyBundle.cs
│   │   │   └── LoginAttempt.cs
│   │   │
│   │   ├── DTOs/
│   │   │   ├── SendMessageDto.cs
│   │   │   ├── DeliveryAckDto.cs
│   │   │   ├── WipeCommandDto.cs
│   │   │   ├── WipeAckDto.cs
│   │   │   ├── RegisterRequestDto.cs
│   │   │   ├── RegisterResponseDto.cs
│   │   │   ├── LoginRequestDto.cs
│   │   │   ├── LoginResponseDto.cs
│   │   │   └── DeviceRegistrationDto.cs
│   │   │
│   │   ├── Data/
│   │   │   └── HysjDbContext.cs           # EF Core DbContext
│   │   │
│   │   ├── Middleware/
│   │   │   ├── RateLimitMiddleware.cs
│   │   │   └── NoLogMiddleware.cs
│   │   │
│   │   ├── BackgroundServices/
│   │   │   ├── MessageExpiryService.cs    # IHostedService: fei Redis
│   │   │   └── WipePendingService.cs      # IHostedService: retry wipe
│   │   │
│   │   └── Extensions/
│   │       ├── ServiceCollectionExtensions.cs  # DI-oppsett
│   │       └── WebApplicationExtensions.cs     # Middleware-pipeline
│   │
│   └── Hysj.Shared/                      # Class Library (delte modeller)
│       ├── Hysj.Shared.csproj
│       └── Constants/
│           └── HysjConstants.cs
│
├── tests/
│   └── Hysj.Api.Tests/                   # xUnit Test Project
│       ├── Hysj.Api.Tests.csproj
│       ├── MessageQueueTests.cs
│       ├── WipeServiceTests.cs
│       ├── ExpiryTests.cs
│       └── RateLimitTests.cs
│
├── docker-compose.yml
├── docker-compose.dcproj                  # VS2022 Docker Compose project
├── .editorconfig
├── CLAUDE.md
└── README.md
```

### Opprette prosjektene i VS2022

```
1. File → New → Project → "ASP.NET Core Web API"
   - Navn: Hysj.Api
   - Solution: Hysj
   - .NET 8.0
   - ✅ Use controllers
   - ✅ Enable OpenAPI support
   - ✅ Do not use top-level statements (valgfritt)

2. Høyreklikk Solution → Add → New Project → "Class Library"
   - Navn: Hysj.Shared

3. Høyreklikk Solution → Add → New Project → "xUnit Test Project"
   - Navn: Hysj.Api.Tests

4. Høyreklikk Solution → Add → Docker Compose Support
   - Legger til docker-compose.dcproj

5. Referanser:
   - Hysj.Api → Add Reference → Hysj.Shared
   - Hysj.Api.Tests → Add Reference → Hysj.Api
```

---

## NuGet-pakker (installer via VS2022 Package Manager)

### Hysj.Api
Høyreklikk Hysj.Api → `Manage NuGet Packages` → installer:

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

### Hysj.Api.Tests
```
Microsoft.NET.Test.Sdk
xunit
xunit.runner.visualstudio
Moq
FluentAssertions
Microsoft.AspNetCore.Mvc.Testing                       8.*
Testcontainers                                         # Docker-basert integrasjonstest
Testcontainers.Redis
Testcontainers.PostgreSql
```

---

## Hysj.Api.csproj

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>Hysj.Api</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.*">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
    </PackageReference>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.*" />
    <PackageReference Include="StackExchange.Redis" Version="2.*" />
    <PackageReference Include="Konscious.Security.Cryptography.Argon2" Version="1.*" />
    <PackageReference Include="AspNetCoreRateLimit" Version="5.*" />
    <PackageReference Include="Otp.NET" Version="1.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Hysj.Shared\Hysj.Shared.csproj" />
  </ItemGroup>

</Project>
```

---

## Konfigurasjonsfiler

### appsettings.json
```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=hysj;Username=hysj;Password=CHANGE_ME",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Secret": "CHANGE_ME_MIN_32_CHARS_LONG_SECRET_KEY_HERE",
    "Issuer": "Hysj",
    "Audience": "HysjApp",
    "ExpiryMinutes": 60
  },
  "MessagePolicy": {
    "TtlSeconds": 259200,
    "MaxPerMinute": 60
  },
  "WipePolicy": {
    "TtlSeconds": 2592000,
    "MaxPerHour": 3,
    "Require2FA": true
  },
  "RateLimit": {
    "LoginAttemptsPerWindow": 5,
    "WindowMinutes": 15,
    "LockoutMinutes": 30
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Hysj.Api.Hubs": "Warning",
      "Hysj.Api.Services": "Warning"
    }
  }
}
```

### appsettings.Development.json
```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=hysj_dev;Username=hysj;Password=dev_password",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Secret": "DEV_ONLY_NOT_FOR_PRODUCTION_32_CHARS!!"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

### Properties/launchSettings.json
```json
{
  "profiles": {
    "Hysj.Api": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "swagger",
      "applicationUrl": "https://localhost:7100;http://localhost:5100",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    "Docker": {
      "commandName": "Docker",
      "launchBrowser": true,
      "launchUrl": "{Scheme}://{ServiceHost}:{ServicePort}/swagger"
    }
  }
}
```

---

## Teknisk Stack

| Komponent | Teknologi |
|-----------|-----------|
| IDE | Visual Studio 2022 (17.x) |
| Backend API | ASP.NET Core 8 Web API |
| Sanntid | SignalR (WebSocket) |
| Midlertidig kø | Redis (in-memory, ingen disk) |
| Database | PostgreSQL via EF Core 8 |
| Autentisering | JWT Bearer + TOTP 2FA |
| Passord-hashing | Argon2id |
| Rate-limiting | AspNetCoreRateLimit |
| Testing | xUnit + FluentAssertions + Testcontainers |
| Debug | VS2022 debugger med Hot Reload |
| Container | Docker Compose (VS2022 integrert) |

---

## Arkitektur: Null-Lagring

```
AVSENDER                    SERVER                     MOTTAKER
   │                          │                           │
   ├─ Krypterer melding       │                           │
   │  (AES-256-GCM)           │                           │
   │                          │                           │
   ├──── Sender kryptert ────>│                           │
   │     blob via SignalR     │                           │
   │                          │                           │
   │                    ┌─────┴─────┐                     │
   │                    │ Mottaker  │                     │
   │                    │ online?   │                     │
   │                    └─────┬─────┘                     │
   │                     JA   │   NEI                     │
   │                     │    │    │                      │
   │                     │    │    ├─ Legg i Redis        │
   │                     │    │    │  (maks 72 timer,     │
   │                     │    │    │   ingen disk)        │
   │                     │    │    │                      │
   │                     │    │    ├─ Mottaker kobler til │
   │                     ▼    │    ▼                      │
   │              Lever til mottaker ────────────────────>│
   │                          │                           │
   │                    SLETT UMIDDELBART                  │
   │                    fra server-minne                  │
   │                          │                           │
```

---

## Tre Slette-Mekanismer

### 1. Auto-slett etter levering (server)
- Melding levert → slett fra Redis UMIDDELBART
- Mottaker sender `DeliveryAck` → serveren verifiserer sletting
- Bakgrunnsjobb feier Redis hvert 5. minutt

### 2. TTL-utløp for uleverte meldinger (server)
- Mottaker offline → melding i Redis med TTL 72 timer
- Etter 72 timer: Redis sletter automatisk
- Avsender får varsel: "Meldingen utløp"

### 3. Remote Wipe (klient-til-klient via server)

```
ENHET A (telefon)              SERVER                ENHET B (PC)
   │                             │                       │
   ├── WipeCommand ────────────>│                       │
   │   {                        │                       │
   │     Type: "All" |          │                       │
   │          "Conversation" |  │                       │
   │          "Device",         │                       │
   │     ConversationId?,       │                       │
   │     TargetDeviceId?,       │                       │
   │     Timestamp              │                       │
   │   }                        │                       │
   │                            ├── WipeCommand ───────>│
   │                            │                       │
   │                            │                  Slett lokalt:
   │                            │                  - SQLite meldinger
   │                            │                  - Krypterte filer
   │                            │                  - Cached media
   │                            │                       │
   │                            │<── WipeAck ───────────┤
   │<── WipeConfirmed ─────────│                       │
   │                            │                       │
   │                            │  SLETT WipeCommand    │
   │                            │  fra Redis            │
```

### Wipe-typer:

| Type | Hva slettes | Brukstilfelle |
|------|------------|---------------|
| `WipeType.Conversation` | Én samtale på alle enheter | Slett chat med én person |
| `WipeType.Device` | Alt på én spesifikk enhet | Mistet telefon |
| `WipeType.All` | Alt på ALLE enheter | Nødssituasjon |

---

## Database-modell (PostgreSQL + EF Core)

**VIKTIG: Databasen lagrer ALDRI meldinger. Kun brukere, enheter og nøkler.**

```
┌─────────────────────────────┐
│ Users                       │
├─────────────────────────────┤
│ Id (Guid, PK)               │
│ Username (string, unique)   │
│ PasswordHash (string)       │ ← Argon2id
│ Salt (byte[])               │
│ IdentityPublicKey (byte[])  │ ← Langtids ECC-nøkkel
│ TotpSecret (byte[])         │ ← Kryptert
│ CreatedAt (DateTimeOffset)  │
│ LastSeenAt (DateTimeOffset)  │
└─────────────────────────────┘
          │ 1:N
          ▼
┌─────────────────────────────┐
│ Devices                     │
├─────────────────────────────┤
│ Id (Guid, PK)               │
│ UserId (Guid, FK → Users)   │
│ DeviceName (string)         │
│ PushToken (string?)         │
│ SignedPreKey (byte[])       │
│ SignedPreKeySig (byte[])    │
│ IsOnline (bool)             │
│ LastActiveAt (DateTimeOffset)│
│ RegisteredAt (DateTimeOffset)│
└─────────────────────────────┘
          │ 1:N
          ▼
┌─────────────────────────────┐
│ PreKeys                     │
├─────────────────────────────┤
│ Id (int, PK, identity)      │
│ DeviceId (Guid, FK)         │
│ PublicKey (byte[])          │
│ IsUsed (bool, default false)│
│ CreatedAt (DateTimeOffset)  │
└─────────────────────────────┘

┌─────────────────────────────┐
│ LoginAttempts               │
├─────────────────────────────┤
│ Id (long, PK, identity)     │
│ IpAddress (string)          │
│ Username (string)           │
│ Success (bool)              │
│ Timestamp (DateTimeOffset)  │
│ UserAgent (string?)         │
└─────────────────────────────┘

⛔ INGEN Messages-tabell
⛔ INGEN Conversations-tabell
⛔ INGEN Attachments-tabell
```

### EF Core Migrations (Package Manager Console i VS2022)

```powershell
# Tools → NuGet Package Manager → Package Manager Console
# Default project: src\Hysj.Api

Add-Migration InitialCreate
Update-Database

# Eller via terminal:
dotnet ef migrations add InitialCreate --project src/Hysj.Api
dotnet ef database update --project src/Hysj.Api
```

---

## Redis-konfigurasjon (Null Disk)

```
# redis.conf — INGEN disk-lagring
save ""
appendonly no
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### Redis nøkkelstruktur:
```
msg:{recipientDeviceId}:{messageId}     → kryptert blob    TTL: 72 timer
wipe:{targetDeviceId}:{wipeId}          → wipe-kommando    TTL: 30 dager
```

---

## Meldingsflyt

### Online mottaker (direkte):
```
1. Avsender → ChatHub.SendMessage(recipientId, encryptedBlob)
2. Server: mottaker tilkoblet? JA
3. Server → Mottaker via SignalR
4. Mottaker → ChatHub.AcknowledgeDelivery(messageId)
5. Ingenting å slette (aldri lagret)
```

### Offline mottaker (Redis-kø):
```
1. Avsender → ChatHub.SendMessage(recipientId, encryptedBlob)
2. Server: mottaker tilkoblet? NEI
3. Redis: SET msg:{deviceId}:{msgId} blob EX 259200
4. Avsender får: "queued"
5. Mottaker kobler til → hent alle ventende → lever → DEL fra Redis
```

---

## Sikkerhetskonfigurasjon

### Rate-limiting:
```
Login:           5 forsøk / 15 min / IP → lås 30 min
Meldinger:       60 / min / bruker
Wipe:            3 / time / bruker (+ krever 2FA)
PreKey-henting:  30 / min / bruker
Registrering:    3 / time / IP
```

### Hva serveren ALDRI gjør:
```
⛔ Lagrer meldingsinnhold
⛔ Lagrer meldingsmetadata (hvem → hvem)
⛔ Logger meldingsinnhold
⛔ Logger IP lenger enn 24 timer
⛔ Beholder data etter levering
⛔ Tar backup av Redis
⛔ Har tilgang til krypteringsnøkler
```

---

## VS2022-spesifikke konvensjoner

### Kodekonvensjoner
- C# 12 med `file-scoped namespaces`
- `nullable enable` i alle prosjekter
- `ImplicitUsings enable`
- Interface for alle services (`IMessageQueueService` → `MessageQueueService`)
- Dependency Injection via `IServiceCollection` extensions
- `record` for DTOs, `class` for EF Core-modeller
- Bruk `DateTimeOffset` (ikke `DateTime`) for alle tidsstempler

### Navngivning (C# standard)
```
PascalCase:  Klasser, metoder, properties, enums
camelCase:   Lokale variabler, parametere
_camelCase:  Private felt
I-prefix:    Interfaces (IMessageQueueService)
Async-suffix: Async metoder (SendMessageAsync)
```

### VS2022 Tips
```
- Ctrl+Shift+B        → Build Solution
- F5                   → Start med debugger (sett breakpoints i ChatHub)
- Ctrl+F5              → Start uten debugger
- Ctrl+Shift+T         → Test Explorer (kjør xUnit-tester)
- Alt+Enter            → Quick Actions (generer interface, etc.)
- Tools → NuGet PMC    → Package Manager Console for EF migrations
- Docker Compose        → Høyreklikk docker-compose → "Start"
```

### .editorconfig (legg i solution root)
```ini
root = true

[*.cs]
indent_style = space
indent_size = 4
charset = utf-8
end_of_line = crlf
dotnet_sort_system_directives_first = true
csharp_style_namespace_declarations = file_scoped:suggestion
csharp_style_var_for_built_in_types = true:suggestion
```

---

## Docker Compose

```yaml
services:
  hysj-api:
    build:
      context: .
      dockerfile: src/Hysj.Api/Dockerfile
    ports:
      - "5100:8080"
      - "7100:8081"
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
    # INGEN volumes — alt forsvinner ved restart

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

---

## Prioritert utviklingsrekkefølge

```
 1. VS2022 Solution       → Opprett Hysj.sln med alle prosjekter
 2. NuGet-pakker           → Installer alle avhengigheter
 3. Models + DbContext      → User, Device, PreKey, LoginAttempt + EF Core
 4. EF Migrations           → Add-Migration InitialCreate → Update-Database
 5. DTOs                    → Request/Response records for alle endepunkter
 6. AuthService             → Register, Login, JWT, Argon2id, TOTP
 7. AuthController          → POST /api/auth/register, /api/auth/login
 8. RateLimitMiddleware     → Brute force-beskyttelse
 9. MessageQueueService     → Redis SET med TTL, GET+DEL
10. ChatHub                 → SignalR: SendMessage, AcknowledgeDelivery
11. MessageExpiryService    → IHostedService: fei Redis
12. WipeService             → Remote wipe-distribusjon
13. WipeController          → POST /api/wipe (krever 2FA)
14. DevicesController       → CRUD for enheter
15. KeysController          → PreKey-bunter
16. Tester                  → Verifiser at INGENTING lagres
```

---

## Teststrategi (xUnit + Test Explorer)

Kjør via VS2022: `Test → Test Explorer → Run All`

```
TEST: "Melding slettes etter levering"
  → Send melding → Mottaker ACK → Redis nøkkel finnes IKKE

TEST: "Uleverte meldinger utløper"
  → Send til offline bruker → Vent TTL → Redis nøkkel finnes IKKE

TEST: "Remote wipe leveres til alle enheter"
  → 3 enheter → wipe_all → alle mottar WipeCommand

TEST: "Remote wipe krever 2FA"
  → POST /api/wipe uten TOTP → 401 Unauthorized

TEST: "Redis har ingen disk-data"
  → Send 100 meldinger → Restart Redis → Redis er tomt

TEST: "Ingen meldingstabell i PostgreSQL"
  → Sjekk schema → Ingen Messages/Conversations-tabell eksisterer
```
