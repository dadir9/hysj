# DESIGN.md — Hysj Designsystem

> Mørk, solid, minimal. Lilla aksent. Kryptering sterkere enn Signal.

---

## Designfilosofi

Hysj ser ut som et hvelv — mørkt, stille, trygt. Designet kommuniserer: "ingenting lagres, ingenting lekker, ingen vet hvem du er."

```
Nøkkelord:
  - Mørkt, nesten svart
  - Lilla som eneste aksent
  - Avrundede kort med subtile overflater
  - Minimalt — bare det nødvendige
  - Ingen gradienter, ingen aurora, ingen glow
  - Flat, solid overflater
  - Sikkerhetsindikatorer synlige men ikke påtrengende
```

---

## Fargepalett

### Bakgrunner

```
PrimaryBg          #0C0C10        Hovedbakgrunn
SecondaryBg         #111116        Kort, inputfelt
TertiaryBg          #14141C        Subtile overflater, header
CardBg              rgba(255,255,255, 0.04)     Samtalekort, tab-bar
CardBgHover         rgba(255,255,255, 0.06)     Kort ved trykk
InputBg             rgba(255,255,255, 0.05)     Meldingsfelt, søkefelt
```

### Tekst

```
TextPrimary         #FFFFFF                       Titler, brukernavn
TextSecondary       rgba(255,255,255, 0.85)       Meldingstekst
TextMuted           rgba(255,255,255, 0.35)       Forhåndsvisning
TextDim             rgba(255,255,255, 0.22)       Tidsstempler, placeholder
TextGhost           rgba(255,255,255, 0.18)       Svak tekst
```

### Lilla (hovedaksent)

```
Purple              #7C3AED        Egne meldinger, CTA, badge
PurpleLight         #A78BFA        Aktiv tab-tekst, ikoner
PurpleDark          #6D28D9        Avatar gradient mørk
PurpleMid           #8B5CF6        Avatar gradient lys
PurpleBg            rgba(124,58,237, 0.15)    Aktiv filterpille
PurpleSubtle        rgba(124,58,237, 0.18)    Ny-samtale knapp
PurpleGhost         rgba(124,58,237, 0.08)    Anonym-badge bg
PurpleBorder        rgba(124,58,237, 0.15)    Anonym-badge border
```

### Status

```
Online              #34D399        Online-prikk, doble haker
Danger              #EF4444        Slettet, wipe
DangerBg            rgba(239,68,68, 0.06)     Nedtelling-bg
DangerText          rgba(239,68,68, 0.55)     Nedtelling-tekst
Warning             #F59E0B        Admin-badge
WarningBg           rgba(245,158,11, 0.06)    Advarsel-bg
WarningText         rgba(245,158,11, 0.7)     Advarseltekst
```

### Sikkerhetsfarger (🆕)

```
ShieldGreen         #10B981        Fullt sikret (alle 4 lag aktive)
ShieldGreenBg       rgba(16,185,129, 0.08)    Sikkerhetsbadge bg
ShieldGreenBorder   rgba(16,185,129, 0.15)    Sikkerhetsbadge border
ShieldGreenText     rgba(16,185,129, 0.8)     Sikkerhetsbadge tekst

QuantumBlue         #6366F1        Post-quantum indikator
QuantumBlueBg       rgba(99,102,241, 0.08)
OnionPurple         #8B5CF6        Onion routing indikator
SealedTeal          #14B8A6        Sealed sender indikator
```

### Borders

```
BorderSubtle        rgba(255,255,255, 0.06)    Mellom samtalekort
BorderLight         rgba(255,255,255, 0.08)    Inaktiv pille, input
BorderSelected      2px solid #7C3AED          Valgt element
```

### Anonym avatar-farger (12 stk)

```
#7C3AED  #2563EB  #0D9488  #DC2626  #D97706  #059669
#7C2D12  #4338CA  #BE185D  #0369A1  #6D28D9  #B45309
```

---

## Typografi

```
Komponent                    Størrelse    Vekt    Tracking    Farge
─────────────────────────────────────────────────────────────────────
App-tittel "hysj"            28px         700     -0.8px      TextPrimary
Seksjonstittel               15px         600     -0.2px      TextMuted (0.5)
Brukernavn (samtale)         16px         600     -0.3px      TextPrimary
Brukernavn (lest)            16px         500     -0.3px      0.6 alpha
Chat-header navn             16px         600     -0.2px      TextPrimary
Meldingstekst                15px         400     -0.1px      Per boble
Forhåndsvisning              14px         400     —           TextMuted
Tidsstempel (samtale)        12px         400     —           TextDim
Tidsstempel (chat)           11px         400     —           TextGhost
Filterpille aktiv            12px         600     —           PurpleLight
Filterpille inaktiv          12px         500     —           0.25 alpha
Tab-bar label aktiv          10px         500     —           PurpleLight
Tab-bar label inaktiv        10px         400     —           TextDim
Badge-tall                   11px         700     —           TextPrimary
Sikkerhetsbadge              10px         500     —           ShieldGreenText
Krypto-info                  11px         400     —           TextMuted
```

---

## Komponentspesifikasjoner

### 1. Samtaleliste

#### Header
```
Logo "hysj":       28px, weight 700, tracking -0.8, hvit
Undertekst:        "Velkommen, [Navn]", 11px, 0.28 alpha
Søk-knapp:         36×36px, bg 0.05 alpha, radius 12px
Ny-samtale:        36×36px, bg PurpleSubtle, radius 12px, ikon PurpleLight
```

#### Avatar-rekke
```
Avatar:            56×56px, radius 50%, 16px gap
Gradient ring:     2.5px, #6D28D9 → #8B5CF6
Online-prikk:      14×14px, #34D399, 3px border #0E0E12
Label:             11px, 0.3 alpha
```

#### Filterpiller
```
Aktiv:    bg PurpleBg, color PurpleLight, 12px weight 600, 5px 14px, radius 12px
Inaktiv:  bg 0.04 alpha, color 0.25 alpha, 12px weight 500, 5px 14px, radius 12px
```

#### Samtalekort
```
Bakgrunn:          CardBg (0.04 alpha)
Radius:            18px
Padding:           14px 16px
Margin-bottom:     8px
Avatar:            52×52px, radius 50%, 14px gap

Online-prikk:      13×13px, #34D399, 2.5px border #111116
Ulest-badge:       22×22px, #7C3AED, 11px weight 700 hvit
Doble haker:       14×10px, 0.22 alpha (levert) eller #34D399 (lest)

Slettet samtale:   opacity 0.45, bg 0.02 alpha
                   "samtale slettet", 13px italic, DangerText
```

#### Tab-bar
```
Bakgrunn:          CardBg, radius 22px, padding 12px 0 32px
Aktiv:             Fylt SVG #7C3AED, label PurpleLight weight 500
Inaktiv:           Outline SVG 0.22 alpha, label 0.22 alpha
4 tabs:            samtaler, kontakter, sikkerhet, innstillinger
```

---

### 2. Chat-skjerm

#### Chat-header
```
Bakgrunn:    CardBg, radius 20px, padding 12px 16px
Avatar:      40×40px, gradient #231A38→#342A50, initialer #C4B5FD
Navn:        16px, weight 600, hvit
Status:      11px, 0.3 alpha, online-prikk 6×6px #34D399
Ikoner:      Telefon + meny, 20px, 0.3 alpha, 14px gap
```

#### Meldingsbobler
```
Maks bredde:     270px, padding 11px 15px, font 15px lh 1.45

Utgående:        bg #7C3AED, color hvit, radius 20 20 6 20
Innkommende:     bg 0.06 alpha, color 0.88 alpha, radius 20 20 20 6

Tidsstempel:     11px, 0.18 alpha, 4px 6px 0 padding
Doble haker:     14×10px SVG, #34D399, 5px gap
```

#### Gruppemeldinger med alias
```
Alias-avatar:    32×32px, radius 50%, tildelt hex-farge
                 Tekst: 2 første bokstaver, 13px weight 600, hvit
Alias-navn:      12px, weight 600, samme farge som avatar (0.8 alpha)
                 2px margin under, over boblen
Boble:           Samme som vanlig innkommende
```

#### Dato-separator
```
Sentrert, 11px, 0.18 alpha, bg 0.03 alpha, 5px 16px padding, radius 12px
```

#### Auto-slett nedtelling
```
Sentrert, bg DangerBg, radius 12px, 5px 14px padding
Ikon: Sirkel+strek 12px DangerIcon, tekst 11px DangerText
```

#### Anonym-badge
```
Over inputfelt, bg PurpleGhost, border PurpleBorder
Radius 12px, padding 8px 16px, tekst 13px PurpleLight
```

#### Lydmelding
```
Play: 36×36px sirkel 0.06 alpha, trekant 14px rgba(167,139,250, 0.7)
Waveform: 2.5px barer, 2px gap, 4-18px høyde, lilla 0.25-0.6 alpha
Varighet: 11px, 0.28 alpha
```

#### Input-felt
```
Padding: 10px 16px 38px (safe area)
Vedlegg: 34×34px, 0.05 alpha bg, radius 50%, pluss 16px 0.28 alpha
Felt: 0.05 alpha bg, radius 22px, 10px 16px padding, 15px placeholder 0.22
Mikrofon: 18px, 0.2 alpha, inne i feltet høyre side
Send: 34×34px, #7C3AED, radius 50%, pil 16px hvit
```

---

### 3. Sikkerhetsindikatorer (🆕)

#### Krypteringsnivå-badge i chat-header

Vises under "Aktiv nå · kryptert" teksten i chat-headeren. Viser aktivt sikkerhetsnivå.

```
Full sikkerhet (alle 4 lag):

┌─ Chat Header ──────────────────────────────────┐
│  ← [SK] Sara Knutsen                     📞 ⋮ │
│        Aktiv nå                                │
│        🛡 ratchet · quantum · sealed · onion   │
└────────────────────────────────────────────────┘

Layout:           Flex, align-center, 4px gap
Skjold-ikon:      10px, ShieldGreen
Tekst:            10px, weight 500, ShieldGreenText
Separator:        " · " mellom hvert lag
```

#### Sikkerhetsnivå-varianter

```
Alle 4 aktive:
  Ikon:           Fylt skjold, ShieldGreen
  Tekst:          "ratchet · quantum · sealed · onion"
  Farge:          ShieldGreenText

3 aktive (uten onion):
  Ikon:           Fylt skjold, ShieldGreen
  Tekst:          "ratchet · quantum · sealed"
  Farge:          ShieldGreenText

Under oppsett:
  Ikon:           Outline skjold, 0.3 alpha
  Tekst:          "krypterer..."
  Farge:          TextMuted
```

#### Krypteringsinfo i SecurityPage

Ny seksjon øverst på sikkerhetssiden som viser hvert lag:

```
┌─ Krypteringsstatus ────────────────────────────┐
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔄 Double Ratchet                   ✅  │  │
│  │    Forward secrecy per melding           │  │
│  ├──────────────────────────────────────────┤  │
│  │ 🔮 Post-Quantum                     ✅  │  │
│  │    ECC + Kyber hybrid                    │  │
│  ├──────────────────────────────────────────┤  │
│  │ 🔒 Sealed Sender                    ✅  │  │
│  │    Avsender skjult for server            │  │
│  ├──────────────────────────────────────────┤  │
│  │ 🧅 Onion Routing                    ✅  │  │
│  │    IP skjult via 3 relay-noder           │  │
│  └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘

Seksjon:
  Bakgrunn:        CardBg
  Radius:          18px

Hver rad:
  Padding:         14px 16px
  Separator:       0.5px, BorderSubtle, margin 0 16px
  Layout:          Flex, space-between, align-center

  Venstre:
    Ikon:          20px (emoji eller SVG)
    Tittel:        15px, weight 500, TextPrimary
    Undertekst:    12px, TextMuted
    Gap:           12px ikon→tekst

  Høyre (status):
    Aktiv:         ✅ ShieldGreen
    Inaktiv:       ⬜ 0.2 alpha
    Laster:        Spinner, PurpleLight
```

#### Krypto-lag ikoner (SVG, 20px)

```
Double Ratchet:    To piler i sirkel (🔄 men som SVG)
                   Aktiv: ShieldGreen stroke
                   Inaktiv: 0.25 alpha stroke

Post-Quantum:      Atom/molekyl-form
                   Aktiv: QuantumBlue stroke
                   Inaktiv: 0.25 alpha stroke

Sealed Sender:     Lukket konvolutt med lås
                   Aktiv: SealedTeal stroke
                   Inaktiv: 0.25 alpha stroke

Onion Routing:     3 konsentriske sirkler (løk-lag)
                   Aktiv: OnionPurple stroke
                   Inaktiv: 0.25 alpha stroke
```

---

### 4. Sikkerhetspanel (utvidet)

#### Seksjon: Krypteringsstatus (øverst, NY)
```
Se over — 4 rader med status per krypto-lag
```

#### Seksjon: Sikkerhetstoggler
```
Rad-format med toggle:
  E2E-kryptering:     Alltid på (toggle disabled, ShieldGreen)
  2FA:                 Toggle
  Auto-slett:          Chevron → detaljer
```

#### Seksjon: Dine enheter
```
Enhet-ikon:        22px
  Aktiv:           #34D399 stroke
  Annen:           0.35 alpha stroke
"Denne" badge:     10px weight 600, bg Online 0.12, color Online, 2px 8px, radius 6px
```

#### Seksjon: Faresone
```
Tittel:            "FARESONE", 12px weight 600, tracking 0.5, #EF4444, uppercase
Wipe-ikon:         32×32px, bg Danger 0.12, radius 8px, ikon Danger
Wipe-tittel:       15px, Danger
Wipe-undertekst:   11px, TextMuted

3 nivåer:
  Slett samtale:    Søppelbøtte-ikon, "Fjern fra alle enheter"
  Wipe enhet:       Skjerm med X, "Slett alt på én enhet"
  Slett ALT:        Weight 600, bg Danger 0.2, "Nødknapp — krever 2FA"
```

#### Seksjon: Relay-noder (NY)
```
Tittel:            "ONION ROUTING", 12px weight 600, tracking 0.5, OnionPurple
Viser status for relay-noder:

┌──────────────────────────────────────────────┐
│  🧅 Node 1 (Frankfurt)              ✅ aktiv │
│  🧅 Node 2 (Amsterdam)              ✅ aktiv │
│  🧅 Node 3 (Zürich)                 ✅ aktiv │
│                                              │
│  Rute: din IP → 🧅→🧅→🧅 → server          │
│  Din IP er skjult fra serveren               │
└──────────────────────────────────────────────┘

Node-rad:
  Padding:         12px 16px
  Ikon:            16px, OnionPurple
  Navn:            14px, TextSecondary
  Lokasjon:        12px, TextMuted, i parentes
  Status:          ✅ ShieldGreen eller ❌ Danger

Rute-info:
  Font:            12px, TextMuted
  Padding:         10px 16px
  Bakgrunn:        rgba(139,92,246, 0.04)
  Radius:          10px
```

---

### 5. Opprett gruppe

#### Gruppetype-velger
```
2 kort, 50% bredde, 12px gap, ~90px høy

Valgt:     2px border #7C3AED, bg PurpleGhost, ikon PurpleLight, radius 16px
Ikke valgt: 0.5px border BorderLight, bg 0.03 alpha, ikon 0.3 alpha, radius 16px

"Kan ikke endres" advarsel:
  bg WarningBg, border WarningBorder, color WarningText
  12px, radius 10px, 8px 14px padding, margin-top 12px
```

#### Opprett-knapp
```
100% bredde, bg #7C3AED, radius 14px, 14px padding
Tekst: 16px weight 600 hvit
Deaktivert: opacity 0.4
```

### Admin-badge
```
"admin", bg Warning 0.12, color Warning, 10px weight 600, radius 6px, 2px 8px
```

---

## Sikkerhetsnivå-ikon (SecurityIndicator control)

Brukes flere steder: chat-header, samtaleliste, sikkerhetssiden.

```
Kompakt versjon (chat-header, samtaleliste):
  Layout:          Inline, 1 linje
  Skjold:          10px SVG, ShieldGreen (fylt)
  Tekst:           10px, ShieldGreenText
  Eksempel:        🛡 4/4 sikret

Utvidet versjon (sikkerhetssiden):
  Layout:          Vertikal liste, 4 rader
  Se: Krypteringsinfo i SecurityPage over
```

---

## Telefon-ramme

```
Bredde:            375px
Høyde:             812px
Radius:            40px
Border:            2px solid #1C1C1E
Bakgrunn:          linear-gradient(175deg, #0C0C10, #111116, #14141C)
Dynamic Island:    126×34px, rgba(0,0,0,0.5), radius 0 0 20px 20px
```

---

## Ikoner

```
Stroke-width:      1.5px, round caps, round joins, no fill

Standard (20-22px): Samtaler, Kontakter, Sikkerhet, Innstillinger,
                    Søk, Ny samtale, Tilbake, Telefon, Meny, Send,
                    Vedlegg, Mikrofon, Slett, Kryss, Hake, Doble haker,
                    Gruppe, Advarsel

Krypto (20px):     🔄 Ratchet (piler i sirkel)
                   🔮 Quantum (atom-form)
                   🔒 Sealed (konvolutt+lås)
                   🧅 Onion (3 konsentriske sirkler)
                   🛡 Skjold (fylt = aktiv, outline = inaktiv)
```

---

## Animasjoner

```
Kort-trykk:        scale(0.98), 100ms ease
Boble inn:         fadeIn + translateY(8px), 200ms ease-out
Send-knapp:        scale(0.9) → scale(1), 150ms
Tab-bytte:         Ikon crossfade, 200ms
Sikkerhetsbadge:   fadeIn 300ms (når krypto-handshake er ferdig)
Relay-tilkobling:  Pulserende prikk mens den kobler til
Wipe-bekreftelse:  Rød puls-ring, 2s infinite
```

---

## Spacing-system

```
4px    Micro         8px    Small        12px   Medium       16px   Large
6px    Tight         10px   Med-small    14px   Med-large    20px   XL
32px   Safe area bottom    38px   Input bottom    42px   Top safe area
```

---

## Responsivitet

```
375px (iPhone):     Standard layout
428px (Pro Max):    Sentrert, mer whitespace
Tablet/desktop:     Split-view: samtaleliste 320px + chat resten
```
