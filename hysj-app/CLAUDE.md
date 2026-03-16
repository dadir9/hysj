# CLAUDE.md — Hysj Frontend + Krypto-oppgradering

> Sikker meldingsapp. Null-lagring. Alt slettes. Remote wipe. Anonyme grupper.
> **Kryptering sterkere enn Signal.**
>
> **IDE: Visual Studio 2022** | **Stack: .NET MAUI / C# 12 / .NET 8**

---

## Hva dette er

Hysj er en ende-til-ende-kryptert meldingsapp. Backenden er ferdig. Denne prompten dekker:

1. **Frontend-klient** (.NET MAUI)
2. **Anonym gruppechat** (alias-system)
3. **4 krypteringsoppgraderinger** som gjør Hysj sterkere enn Signal

---

## Hysj vs Signal — Sammenlikning etter oppgradering

```
Funksjon                    Signal              Hysj (etter)
──────────────────────────────────────────────────────────────
E2EE                        ✅ Signal Protocol   ✅ Signal Protocol
Double Ratchet              ✅                   ✅ Identisk
Forward Secrecy             ✅ Per melding        ✅ Per melding
Post-Quantum                ❌ Ikke ennå          ✅ ECC + Kyber hybrid
Sealed Sender               ✅                   ✅ Forbedret versjon
Onion Routing               ❌                   ✅ 3-hop ruting
Null-lagring server         ❌ Beholder i kø      ✅ Slett umiddelbart
Remote Wipe                 ❌                   ✅ 3 nivåer
Auto-slett server (TTL)     ❌                   ✅ 72 timer
Anonyme grupper             ❌                   ✅ Alias-system
Metadata-beskyttelse        Delvis               ✅ Full (onion + sealed)
```

---

## OPPGRADERING 1: Double Ratchet (Signal Protocol)

### Hva det løser
Uten Double Ratchet: kompromittert nøkkel = alle meldinger kan leses.
Med Double Ratchet: kompromittert nøkkel = KUN den ene meldingen.

### Hvordan det fungerer

```
Alice → Bob: Melding 1

    Alice                                    Bob
    ──────                                   ────
    Identitetsnøkkel (IK_A)                  Identitetsnøkkel (IK_B)
    Signed Pre-Key (SPK_A)                   Signed Pre-Key (SPK_B)
    Ephemeral Key (EK_A)                     One-Time Pre-Key (OPK_B)

    STEG 1: X3DH Handshake (første gang)
    ─────────────────────────────────────
    Alice beregner 4 DH-operasjoner:
      DH1 = ECDH(IK_A, SPK_B)
      DH2 = ECDH(EK_A, IK_B)
      DH3 = ECDH(EK_A, SPK_B)
      DH4 = ECDH(EK_A, OPK_B)
    
    Master Secret = HKDF(DH1 || DH2 || DH3 || DH4)
    → Initialiserer Double Ratchet med dette

    STEG 2: Double Ratchet (hver melding)
    ─────────────────────────────────────
    Melding 1: Root Key → Chain Key 1 → Message Key 1
    Melding 2: Root Key → Chain Key 2 → Message Key 2
    Melding 3: (Bob svarer) → Ny DH → Ny Root Key → ...

    Hver melding har sin EGEN nøkkel.
    Gamle nøkler slettes permanent etter bruk.
    → Selv om nøkkel N kompromitteres, er N-1 og N+1 trygge.
```

### Implementasjon

```
Hysj.Crypto/
├── X3DH/
│   ├── X3DHInitiator.cs          # Alice-siden av handshake
│   ├── X3DHResponder.cs          # Bob-siden av handshake
│   └── X3DHResult.cs             # Delt hemmelighet fra handshake
│
├── Ratchet/
│   ├── DoubleRatchet.cs          # Hovedklassen
│   ├── RatchetState.cs           # Serialiserbar tilstand
│   ├── RootChain.cs              # KDF Root Chain
│   ├── SendingChain.cs           # KDF Sending Chain
│   ├── ReceivingChain.cs         # KDF Receiving Chain
│   ├── MessageKey.cs             # Engangs meldingsnøkkel
│   └── SkippedKeys.cs            # For ut-av-rekkefølge-meldinger
│
├── EccKeyPair.cs                 # Uendret
├── EcdhExchange.cs               # Uendret
├── AesGcmCipher.cs               # Uendret
└── HkdfDeriver.cs                # Uendret
```

```csharp
// Crypto/Ratchet/DoubleRatchet.cs — Kjerneflyt

public class DoubleRatchet
{
    private RatchetState _state;

    // Krypter melding (sende)
    public (byte[] ciphertext, MessageHeader header) Encrypt(byte[] plaintext)
    {
        // 1. Avled ny meldingsnøkkel fra sending chain
        var messageKey = _state.SendingChain.NextMessageKey();
        
        // 2. Krypter med AES-256-GCM
        var ciphertext = AesGcmCipher.Encrypt(plaintext, messageKey.Key);
        
        // 3. Slett meldingsnøkkel UMIDDELBART
        messageKey.Dispose();
        
        // 4. Returner kryptert melding + header (for ratchet-sync)
        return (ciphertext, new MessageHeader(
            _state.DHPublic,
            _state.SendingChain.Index,
            _state.PreviousChainLength
        ));
    }

    // Dekrypter melding (motta)
    public byte[] Decrypt(byte[] ciphertext, MessageHeader header)
    {
        // 1. Sjekk om vi trenger DH ratchet (ny avsender-nøkkel)
        if (header.DHPublic != _state.RemoteDHPublic)
        {
            PerformDHRatchet(header.DHPublic);
        }
        
        // 2. Avled riktig meldingsnøkkel
        var messageKey = _state.ReceivingChain.GetMessageKey(header.MessageIndex);
        
        // 3. Dekrypter
        var plaintext = AesGcmCipher.Decrypt(ciphertext, messageKey.Key);
        
        // 4. Slett meldingsnøkkel UMIDDELBART
        messageKey.Dispose();
        
        return plaintext;
    }
}
```

### Lagring av ratchet-tilstand

```
Per samtale lagres i SecureStorage:
  - RatchetState (serialisert, kryptert)
  - Inneholder: root key, chain keys, DH-nøkler, indekser
  - Oppdateres etter HVER melding
  - Ved remote wipe: slett ALT
```

---

## OPPGRADERING 2: Post-Quantum Hybrid (ECC + Kyber)

### Hva det løser
Quantum-datamaskiner kan knekke ECC. Ved å legge til Kyber (lattice-basert) er Hysj sikker selv mot fremtidens quantum-angrep. Signal har IKKE dette ennå.

### Hvordan det fungerer

```
Vanlig ECC (nåværende):
  Alice ──ECDH──→ Delt hemmelighet ──→ AES-nøkkel
  
  Risiko: Quantum-dator knekker ECDH → alle meldinger leses

Hybrid ECC + Kyber (oppgradert):
  Alice ──ECDH──────→ Hemmelighet 1
  Alice ──Kyber KEM──→ Hemmelighet 2
  
  Kombinert: HKDF(Hemmelighet 1 || Hemmelighet 2) → AES-nøkkel
  
  Selv om quantum knekker ECDH (hemmelighet 1),
  kan den IKKE knekke Kyber (hemmelighet 2).
  → Begge må knekkes for å lese meldingen.
  → Umulig med dagens OG fremtidens teknologi.
```

### Implementasjon

```
Hysj.Crypto/
├── PostQuantum/
│   ├── KyberKem.cs                # CRYSTALS-Kyber Key Encapsulation
│   ├── HybridKeyExchange.cs       # ECC + Kyber kombinert
│   └── HybridResult.cs            # Kombinert delt hemmelighet
```

```csharp
// Crypto/PostQuantum/HybridKeyExchange.cs

public static class HybridKeyExchange
{
    public static byte[] DeriveHybridSecret(
        ECDiffieHellman myEccPrivate,
        byte[] theirEccPublic,
        byte[] kyberCiphertext,
        byte[] myKyberPrivate)
    {
        // 1. Klassisk ECDH
        byte[] eccSecret = EcdhExchange.DeriveSharedSecret(myEccPrivate, theirEccPublic);
        
        // 2. Post-Quantum Kyber decapsulate
        byte[] kyberSecret = KyberKem.Decapsulate(kyberCiphertext, myKyberPrivate);
        
        // 3. Kombiner begge hemmeligheter
        byte[] combined = new byte[eccSecret.Length + kyberSecret.Length];
        eccSecret.CopyTo(combined, 0);
        kyberSecret.CopyTo(combined, eccSecret.Length);
        
        // 4. Avled endelig nøkkel med HKDF
        byte[] finalKey = HkdfDeriver.DeriveKey(combined, salt: null, info: "hysj-hybrid-v1", 32);
        
        // 5. Nullstill mellomliggende hemmeligheter
        CryptographicOperations.ZeroMemory(eccSecret);
        CryptographicOperations.ZeroMemory(kyberSecret);
        CryptographicOperations.ZeroMemory(combined);
        
        return finalKey;
    }
}
```

### NuGet-pakke

```xml
<PackageReference Include="BouncyCastle.Cryptography" />
<!-- Inneholder CRYSTALS-Kyber, CRYSTALS-Dilithium -->
```

### Integrasjon med Double Ratchet

```
X3DH handshake bruker hybrid:
  DH1 = HybridECDH+Kyber(IK_A, SPK_B)
  DH2 = HybridECDH+Kyber(EK_A, IK_B)
  DH3 = HybridECDH+Kyber(EK_A, SPK_B)
  DH4 = HybridECDH+Kyber(EK_A, OPK_B)

DH Ratchet-steg bruker hybrid:
  Ny DH-operasjon = HybridECDH+Kyber(ny nøkkel)
  → Hver ratchet-rotasjon er quantum-sikker

PreKeyBundle utvides:
  + KyberPublicKey (byte[])         # Kyber offentlig nøkkel
  + KyberSignedPreKey (byte[])      # Signert med Dilithium
```

---

## OPPGRADERING 3: Sealed Sender

### Hva det løser
Uten Sealed Sender: serveren vet at Alice → Bob (metadata).
Med Sealed Sender: serveren vet IKKE hvem som sender.

### Hvordan det fungerer

```
Vanlig sending:
  Alice → Server: {fra: Alice, til: Bob, kryptert blob}
  Server vet: Alice snakker med Bob ← METADATA LEKKER

Sealed Sender:
  1. Alice krypterer avsender-info MED meldingen:
     innerpayload = Encrypt(avsender: "Alice" + melding, Bobs nøkkel)
  
  2. Alice pakker i "sealed" konvolutt:
     sealed = {til: Bob, payload: innerpayload}
     (ingen "fra"-felt!)
  
  3. Server mottar: {til: Bob, payload: [kryptert blob]}
     Server vet: noen sendte noe til Bob
     Server vet IKKE: hvem som sendte det

  4. Bob dekrypterer og finner avsender-info inne i meldingen:
     dekryptert = {fra: Alice, melding: "Hei!"}
     Bob vet: denne er fra Alice (verifisert kryptografisk)
```

### Implementasjon

```
Hysj.Crypto/
├── SealedSender/
│   ├── SealedEnvelope.cs          # Pakk melding uten avsender
│   ├── SealedOpener.cs            # Åpne og verifiser avsender
│   └── SenderCertificate.cs       # Bevis på avsender-identitet
```

```csharp
// Crypto/SealedSender/SealedEnvelope.cs

public static class SealedEnvelope
{
    public static byte[] Seal(
        byte[] plaintext,
        Guid senderId,
        byte[] senderCertificate,     // Signert av serveren, tidsbegrenset
        byte[] recipientPublicKey)
    {
        // 1. Generer ephemeral nøkkelpar (engangs)
        using var ephemeral = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        
        // 2. ECDH med mottakers offentlige nøkkel
        byte[] sharedSecret = EcdhExchange.DeriveSharedSecret(ephemeral, recipientPublicKey);
        
        // 3. Bygg innhold: avsender-ID + sertifikat + selve meldingen
        byte[] innerPayload = BuildInnerPayload(senderId, senderCertificate, plaintext);
        
        // 4. Krypter med AES-256-GCM
        byte[] encrypted = AesGcmCipher.Encrypt(innerPayload, sharedSecret);
        
        // 5. Returner: ephemeral public key + kryptert payload
        //    (INGEN avsender-info i klartekst!)
        return Combine(ephemeral.PublicKey.ExportSubjectPublicKeyInfo(), encrypted);
    }
}
```

### Sender Certificate (tillitskjede)

```
Serveren utsteder korttidslevende sertifikater:
  1. Alice autentiserer seg mot serveren (JWT)
  2. Server signerer: {userId: Alice, expires: +24h, publicKey: Alices nøkkel}
  3. Alice inkluderer sertifikatet INNE i sealed envelope
  4. Bob verifiserer sertifikatet mot serverens offentlige nøkkel
  5. Bob vet: denne meldingen er fra en verifisert bruker
     Men serveren visste ALDRI at det var Alice som sendte

Sertifikater utløper etter 24 timer → minimerer risiko ved lekkasje
```

### Backend-endringer

```
Nye endepunkter:
  POST /api/auth/sender-certificate   → SenderCertificateDto
    (Returnerer signert sertifikat, gyldig 24t)

ChatHub endring:
  SendMessage(recipientId, sealedBlob)
  → Serveren ser KUN recipientId + blob
  → Serveren logger IKKE senderId for sealed meldinger
  → Serveren ruter blindt til mottaker
```

---

## OPPGRADERING 4: Onion Routing

### Hva det løser
Uten onion routing: serveren vet Alices IP-adresse.
Med onion routing: INGEN enkelt node vet både avsender OG mottaker.

### Hvordan det fungerer

```
Vanlig:
  Alice ──────→ Hysj Server ──────→ Bob
  Server vet: Alices IP + Bobs ID

Onion Routing (3 hopp):
  Alice → Node 1 → Node 2 → Node 3 → Hysj Server → Bob

  Alice krypterer i 3 lag:
  ┌─────────────────────────────────────────────────────┐
  │ Lag 3 (Node 3 sin nøkkel):                         │
  │ ┌─────────────────────────────────────────────────┐ │
  │ │ Lag 2 (Node 2 sin nøkkel):                     │ │
  │ │ ┌─────────────────────────────────────────────┐ │ │
  │ │ │ Lag 1 (Node 1 sin nøkkel):                 │ │ │
  │ │ │                                             │ │ │
  │ │ │   Sealed melding til Bob                   │ │ │
  │ │ │   + Rute: neste = Node 2                   │ │ │
  │ │ │                                             │ │ │
  │ │ └─────────────────────────────────────────────┘ │ │
  │ │   + Rute: neste = Node 3                       │ │
  │ └─────────────────────────────────────────────────┘ │
  │   + Rute: neste = Hysj Server                      │
  └─────────────────────────────────────────────────────┘

  Node 1 vet: Alice sendte noe (ser IP)
  Node 1 vet IKKE: innholdet eller endelig mottaker

  Node 2 vet: Node 1 sendte noe videre
  Node 2 vet IKKE: at det opprinnelig kom fra Alice

  Node 3 vet: Node 2 sendte noe videre
  Node 3 vet IKKE: Alice eller innholdet

  Hysj Server vet: noen sendte noe til Bob
  Hysj Server vet IKKE: at det var Alice (ingen IP, sealed sender)
```

### Implementasjon

```
Hysj.Crypto/
├── Onion/
│   ├── OnionRouter.cs             # Velg 3 noder, bygg rute
│   ├── OnionLayer.cs              # Krypter/dekrypter ett lag
│   ├── OnionCircuit.cs            # Oppretthold circuit
│   └── RelayNode.cs               # Node-info (IP, offentlig nøkkel)

Hysj.Client/Services/
├── IOnionService.cs
└── OnionService.cs                # Velg noder, bygg onion-pakke
```

```csharp
// Crypto/Onion/OnionRouter.cs

public class OnionRouter
{
    private readonly List<RelayNode> _availableNodes;

    public OnionPacket BuildRoute(byte[] payload, RelayNode destination)
    {
        // 1. Velg 3 tilfeldige relay-noder
        var nodes = SelectRandomNodes(3);
        
        // 2. Krypter fra innerst til ytterst
        byte[] current = payload;
        
        // Lag 3: siste node → server
        current = OnionLayer.Wrap(current, destination.Address, nodes[2].PublicKey);
        
        // Lag 2: node 2 → node 3
        current = OnionLayer.Wrap(current, nodes[2].Address, nodes[1].PublicKey);
        
        // Lag 1: node 1 → node 2
        current = OnionLayer.Wrap(current, nodes[1].Address, nodes[0].PublicKey);
        
        // 3. Send til node 1
        return new OnionPacket(nodes[0].Address, current);
    }
}
```

### Relay-nettverk

```
Alternativ A: Eget relay-nettverk (beste kontroll)
  - Kjør 5-10 relay-noder i forskjellige land/datacenter
  - Hvert relay er en enkel ASP.NET Core app som:
    1. Mottar kryptert pakke
    2. Dekrypterer ytre lag med sin private nøkkel
    3. Leser neste destinasjon
    4. Videresender til neste node
  - Ingen logging av trafikk

Alternativ B: Tor-integrasjon (enklere, men avhengighet)
  - Bruk Tor-nettverket som transport
  - Hysj-serveren kjører som .onion-adresse
  - Klienten kobler via Tor SOCKS proxy

Anbefalt: Start med Alternativ A (3-5 noder), migrer til B for skala.
```

### Backend-endring

```
Nytt endepunkt:
  GET /api/relay/nodes → List<RelayNodeDto>
    Returnerer tilgjengelige relay-noder med offentlige nøkler

Nytt prosjekt:
  Hysj.Relay/                      # ASP.NET Core minimal API
    ├── Program.cs
    ├── RelayService.cs            # Motta → dekrypter → videresend
    └── Dockerfile
```

---

## Komplett krypteringsflyt (alle 4 oppgraderinger sammen)

```
Alice vil sende "Hei!" til Bob:

STEG 1 — Double Ratchet
  Meldingsnøkkel = RatchetState.NextMessageKey()
  payload = AES-256-GCM(plaintext: "Hei!", key: meldingsnøkkel)
  Meldingsnøkkel slettes.

STEG 2 — Post-Quantum Hybrid
  Double Ratchet bruker HybridECDH+Kyber for DH-operasjoner.
  → Alle nøkler er quantum-sikre.

STEG 3 — Sealed Sender
  sealedPayload = SealedEnvelope.Seal(
    payload,
    senderId: Alice,
    senderCert: (signert av server, 24t),
    recipientKey: Bobs offentlige nøkkel
  )
  → Ingen avsender-info i klartekst.

STEG 4 — Onion Routing
  onionPacket = OnionRouter.BuildRoute(
    sealedPayload,
    destination: HysjServer
  )
  → 3 lag kryptering, 3 hopp.

SENDING:
  Alice → Node1 → Node2 → Node3 → HysjServer → Bob

RESULTAT:
  Node1 vet:     Alices IP (men ikke innhold eller mottaker)
  Node2 vet:     Ingenting (kun at den videresender)
  Node3 vet:     Ingenting (kun at den videresender)
  Server vet:    Noen sendte noe til Bob (ikke hvem)
  Bob vet:       Alice sendte "Hei!" (verifisert kryptografisk)

  Quantum-dator: Kan IKKE knekke (hybrid ECC + Kyber)
  Kompromittert nøkkel: Kun ÉN melding påvirket (Double Ratchet)
  Overvåker: Vet IKKE hvem som snakker med hvem (onion + sealed)
```

---

## Oppdatert mappestruktur

```
Hysj.Client/
├── Crypto/
│   ├── EccKeyPair.cs
│   ├── EcdhExchange.cs
│   ├── AesGcmCipher.cs
│   ├── HkdfDeriver.cs
│   │
│   ├── X3DH/                              # 🆕 Signal Protocol handshake
│   │   ├── X3DHInitiator.cs
│   │   ├── X3DHResponder.cs
│   │   └── X3DHResult.cs
│   │
│   ├── Ratchet/                            # 🆕 Double Ratchet
│   │   ├── DoubleRatchet.cs
│   │   ├── RatchetState.cs
│   │   ├── RootChain.cs
│   │   ├── SendingChain.cs
│   │   ├── ReceivingChain.cs
│   │   ├── MessageKey.cs
│   │   └── SkippedKeys.cs
│   │
│   ├── PostQuantum/                        # 🆕 Quantum-sikker
│   │   ├── KyberKem.cs
│   │   ├── HybridKeyExchange.cs
│   │   └── HybridResult.cs
│   │
│   ├── SealedSender/                       # 🆕 Skjul avsender
│   │   ├── SealedEnvelope.cs
│   │   ├── SealedOpener.cs
│   │   └── SenderCertificate.cs
│   │
│   └── Onion/                              # 🆕 Skjul IP
│       ├── OnionRouter.cs
│       ├── OnionLayer.cs
│       ├── OnionCircuit.cs
│       └── RelayNode.cs
│
├── Services/
│   ├── IApiService.cs / ApiService.cs
│   ├── IChatService.cs / ChatService.cs
│   ├── ICryptoService.cs / CryptoService.cs    # Utvidet med alt
│   ├── IKeyManager.cs / KeyManager.cs          # Utvidet med Kyber
│   ├── IOnionService.cs / OnionService.cs      # 🆕
│   ├── IGroupService.cs / GroupService.cs
│   ├── ILocalDbService.cs / LocalDbService.cs
│   ├── IWipeService.cs / WipeService.cs
│   ├── IAuthService.cs / AuthService.cs
│   └── ISecureStorageService.cs / SecureStorageService.cs
│
├── Views/
│   ├── LoginPage.xaml
│   ├── RegisterPage.xaml
│   ├── ConversationListPage.xaml
│   ├── ChatPage.xaml
│   ├── ContactsPage.xaml
│   ├── SecurityPage.xaml
│   ├── SettingsPage.xaml
│   ├── DeviceDetailPage.xaml
│   ├── CreateGroupPage.xaml
│   └── GroupMembersPage.xaml
│
├── ViewModels/
│   ├── (alle ViewModels som før)
│
├── Models/
│   ├── Conversation.cs
│   ├── Message.cs
│   ├── Contact.cs
│   ├── DeviceInfo.cs
│   ├── WipeCommand.cs
│   ├── Group.cs
│   └── GroupMember.cs
│
├── Controls/
│   ├── ChatBubble.xaml
│   ├── AudioWaveform.xaml
│   ├── ConversationCard.xaml
│   ├── AvatarView.xaml
│   ├── DeleteCountdown.xaml
│   ├── WipeButton.xaml
│   ├── GroupTypeSelector.xaml
│   ├── AnonymBadge.xaml
│   ├── AliasAvatar.xaml
│   └── SecurityIndicator.xaml          # 🆕 Lås-ikon med nivå
│
└── Resources/Styles/
    ├── Colors.xaml
    ├── Styles.xaml
    └── Fonts.xaml
```

---

## Oppdaterte NuGet-pakker

```xml
<PackageReference Include="CommunityToolkit.Mvvm" />
<PackageReference Include="CommunityToolkit.Maui" />
<PackageReference Include="Microsoft.AspNetCore.SignalR.Client" />
<PackageReference Include="sqlite-net-pcl" />
<PackageReference Include="SQLitePCLRaw.bundle_green" />
<PackageReference Include="Sodium.Core" />                          # Curve25519, XSalsa20
<PackageReference Include="BouncyCastle.Cryptography" />            # 🆕 Kyber, Dilithium
<PackageReference Include="Otp.NET" />
```

---

## Oppdatert PreKeyBundle (med Kyber)

```csharp
public record PreKeyBundleDto(
    // Klassisk ECC
    byte[] IdentityPublicKey,
    byte[] SignedPreKey,
    byte[] SignedPreKeySignature,
    byte[] OneTimePreKey,
    
    // 🆕 Post-Quantum
    byte[] KyberPublicKey,
    byte[] KyberSignedPreKey,
    byte[] KyberSignedPreKeySignature    // Signert med Dilithium
);
```

---

## Oppdaterte backend-endepunkter

```
AUTH
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/refresh
  POST /api/auth/setup-2fa
  POST /api/auth/verify-2fa
  POST /api/auth/sender-certificate        # 🆕 For Sealed Sender

NØKLER (utvidet med Kyber)
  POST /api/keys/bundle                     # Inkluderer Kyber-nøkler
  GET  /api/keys/{userId}
  POST /api/keys/replenish

ENHETER
  POST /api/devices/register
  GET  /api/devices
  DELETE /api/devices/{deviceId}

WIPE
  POST /api/wipe
  GET  /api/wipe/status/{wipeId}

GRUPPER
  POST   /api/groups
  GET    /api/groups
  GET    /api/groups/{groupId}
  DELETE /api/groups/{groupId}

GRUPPEMEDLEMMER
  GET    /api/groups/{groupId}/members
  POST   /api/groups/{groupId}/members
  DELETE /api/groups/{groupId}/members/{userId}
  POST   /api/groups/{groupId}/leave

RELAY 🆕
  GET /api/relay/nodes                      # Tilgjengelige onion-noder

SIGNALR HUB: /chathub
  SendMessage / ReceiveMessage              # Nå med sealed+onion
  SendGroupMessage / ReceiveGroupMessage
  AcknowledgeDelivery / DeliveryReceipt
  WipeCommand
  TypingIndicator
```

---

## Prioritert utviklingsrekkefølge

```
FASE 1 — Grunnleggende app (uke 1-2):
  1.  Prosjektoppsett, NuGet, Shell
  2.  Design system (Colors.xaml, Styles.xaml)
  3.  Login/Register + JWT
  4.  ConversationListPage + ChatPage (uten krypto)

FASE 2 — Signal Protocol (uke 3-4):
  5.  X3DH handshake (ECC)
  6.  Double Ratchet
  7.  Integrer i ChatService: krypter/dekrypter per melding
  8.  Lagre RatchetState i SecureStorage

FASE 3 — Post-Quantum (uke 5):
  9.  Kyber KEM via BouncyCastle
  10. HybridKeyExchange (ECC + Kyber)
  11. Integrer i X3DH og DH Ratchet-steg
  12. Oppdater PreKeyBundle med Kyber-nøkler

FASE 4 — Sealed Sender (uke 6):
  13. SenderCertificate endepunkt i backend
  14. SealedEnvelope.Seal() / SealedOpener.Open()
  15. Integrer i ChatService.SendMessage()
  16. Fjern senderId fra server-logging

FASE 5 — Onion Routing (uke 7-8):
  17. Hysj.Relay prosjekt (enkel videresender)
  18. Deploy 3-5 relay-noder
  19. OnionRouter.BuildRoute() på klient
  20. Integrer i ChatService (send via relay)

FASE 6 — Gruppechat + anonym (uke 9-10):
  21. Backend: Group, GroupMember + API
  22. CreateGroupPage med typevalg
  23. ChatPage utvidet for grupper
  24. Alias-system for anonyme grupper

FASE 7 — Polering (uke 11-12):
  25. Remote Wipe (motta + sende)
  26. SecurityPage med enhetsliste
  27. Lydmeldinger, push-varsler
  28. Animasjoner, edge cases, testing
```

---

## Kodeprinsipper

### Må-regler:
- MVVM med CommunityToolkit.Mvvm
- ALL kryptering i Hysj.Crypto/ — ingen krypto i ViewModels
- Private nøkler KUN i SecureStorage
- Meldingsnøkler slettes UMIDDELBART etter bruk (CryptographicOperations.ZeroMemory)
- RatchetState oppdateres og lagres etter HVER melding
- Sealed Sender: server logger ALDRI avsender-ID
- Onion: klient velger TILFELDIGE noder hver gang
- Hybrid: ALLTID bruk ECC + Kyber sammen, aldri bare én

### Ikke-gjør:
- ALDRI bruk kun ECC uten Kyber (quantum-sårbart)
- ALDRI gjenbruk meldingsnøkler
- ALDRI hopp over DH ratchet-steg
- ALDRI send avsender-ID i klartekst (bruk sealed)
- ALDRI koble direkte til server uten relay (bruk onion)
- ALDRI logg kryptografiske nøkler eller ratchet-tilstand
- ALDRI blokkér UI-tråden med krypto — bruk Task.Run()
