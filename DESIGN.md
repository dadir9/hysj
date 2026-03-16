# DESIGN.md — Hysj Designsystem

> Det endelige designet fra mockupene. Mørk, solid, minimal. Lilla aksent. Ingen aurora/gradient-bakgrunn.

---

## Designfilosofi

Hysj ser ut som et hvelv — mørkt, stille, trygt. Alt føles midlertidig og privat. Designet kommuniserer: "ingenting lagres her".

```
Nøkkelord:
  - Mørkt, nesten svart
  - Lilla som eneste aksent
  - Avrundede kort med subtile overflater
  - Minimalt — bare det nødvendige
  - Ingen gradienter, ingen aurora, ingen glow
  - Flat, solid overflater
```

---

## Fargepalett

### Bakgrunner

```
PrimaryBg         #0C0C10        Hovedbakgrunn (app-bakgrunn)
SecondaryBg        #111116        Kort-bakgrunn, inputfelt
TertiaryBg         #14141C        Subtile overflater, header

CardBg             rgba(255,255,255, 0.04)     Samtalekort, tab-bar
CardBgHover        rgba(255,255,255, 0.06)     Kort ved trykk
InputBg            rgba(255,255,255, 0.05)     Meldingsfelt, søkefelt
```

### Tekst

```
TextPrimary        #FFFFFF                       Titler, brukernavn, egne meldinger
TextSecondary      rgba(255,255,255, 0.85)       Meldingstekst (innkommende)
TextMuted          rgba(255,255,255, 0.35)       Forhåndsvisning, undertekst
TextDim            rgba(255,255,255, 0.22)       Tidsstempler, placeholder
TextGhost          rgba(255,255,255, 0.18)       Veldig svak tekst, separatorer
```

### Lilla (hovedaksent)

```
Purple             #7C3AED        Egne meldinger, aktiv tab, CTA-knapper, badge
PurpleLight        #A78BFA        Aktiv tab-tekst, ikoner på lilla bg
PurpleDark         #6D28D9        Avatar gradient mørk side
PurpleMid          #8B5CF6        Avatar gradient lys side
PurpleBg           rgba(124,58,237, 0.15)    Aktiv filterpille bakgrunn
PurpleSubtle       rgba(124,58,237, 0.18)    Ny-samtale knapp bakgrunn
PurpleGhost        rgba(124,58,237, 0.08)    Anonym-badge bakgrunn
PurpleBorder       rgba(124,58,237, 0.15)    Anonym-badge border
```

### Status

```
Online             #34D399        Online-prikk, doble haker (levert)
Danger             #EF4444        Slettet-ikon
DangerBg           rgba(239,68,68, 0.06)     Nedtelling-bakgrunn
DangerText         rgba(239,68,68, 0.55)     Nedtelling-tekst, "samtale slettet"
DangerIcon         rgba(239,68,68, 0.45)     Nedtelling-ikon

Warning            #F59E0B        Admin-badge
WarningBg          rgba(245,158,11, 0.06)    "Kan ikke endres" advarsel
WarningText        rgba(245,158,11, 0.7)     Advarseltekst
WarningBorder      rgba(245,158,11, 0.12)    Advarsel-border
```

### Borders og separatorer

```
BorderSubtle       rgba(255,255,255, 0.06)    Mellom samtalekort
BorderLight        rgba(255,255,255, 0.08)    Inaktiv filterpille, inputfelt
BorderSelected     2px solid #7C3AED          Valgt gruppetype
```

### Anonym avatar-farger (12 stk, for alias i grupper)

```
#7C3AED    lilla         #2563EB    blå          #0D9488    teal
#DC2626    rød           #D97706    amber        #059669    grønn
#7C2D12    brun          #4338CA    indigo       #BE185D    rosa
#0369A1    havblå        #6D28D9    dyp lilla    #B45309    oransje
```

---

## Typografi

Skrifttype: System (SF Pro på iOS/Mac, Roboto på Android, Segoe UI på Windows)

```
Komponent                    Størrelse    Vekt    Tracking    Farge
─────────────────────────────────────────────────────────────────────
App-tittel "hysj"            28px         700     -0.8px      TextPrimary
Seksjonstittel               15px         600     -0.2px      TextMuted (0.5 alpha)
Brukernavn (samtale)         16px         600     -0.3px      TextPrimary
Brukernavn (lest)            16px         500     -0.3px      0.6 alpha
Chat-header navn             16px         600     -0.2px      TextPrimary
Meldingstekst                15px         400     -0.1px      Se boble-spesifikk
Meldingstekst (line-height)  1.45
Forhåndsvisning              14px         400     —           TextMuted
Tidsstempel (samtale)        12px         400     —           TextDim
Tidsstempel (chat)           11px         400     —           TextGhost
Filterpille aktiv            12px         600     —           PurpleLight
Filterpille inaktiv          12px         500     —           0.25 alpha
Tab-bar label aktiv          10px         500     —           PurpleLight
Tab-bar label inaktiv        10px         400     —           TextDim
Badge-tall                   11px         700     —           TextPrimary
Undertekst (online/kryptert) 11px         400     —           TextMuted
Avatar-rekke navn            11px         400     —           0.3 alpha
Velkommen-tekst              11px         400     —           0.28 alpha
```

---

## Komponentspesifikasjoner

### 1. Samtaleliste-skjerm

#### Header

```
Layout:            Flex, space-between
Padding:           42px topp (safe area) → 12px → innhold
Logo "hysj":       28px, weight 700, tracking -0.8, hvit
Undertekst:        "Velkommen, [Navn]", 11px, 0.28 alpha

Knapper (høyre):
  Søk:             36×36px, bg rgba(255,255,255, 0.05), radius 12px
                   Ikon: lupe, 17px, 0.35 alpha stroke
  Ny samtale:      36×36px, bg rgba(124,58,237, 0.18), radius 12px
                   Ikon: pluss, 17px, #A78BFA stroke
```

#### Avatar-rekke (Stories-stil)

```
Padding:           18px topp, 14px bunn
Gap:               16px mellom avatarer
Scroll:            Horisontal, overflow hidden

Enkelt avatar:
  Størrelse:       56×56px
  Border-radius:   50%

  "Din status" (første):
    Ytre ring:     Gradient border, 2.5px, #7C3AED → #A78BFA
    Indre sirkel:  #0E0E12 (matcher bakgrunn)
    Ikon:          Pluss, 20px, 0.4 alpha
    Label:         "Din", 11px, 0.3 alpha

  Kontakt med gradient-ring (aktiv chat):
    Ytre ring:     Gradient border, 2.5px, #6D28D9 → #8B5CF6
    Indre sirkel:  #1E1832
    Tekst:         Initialer, 17px, weight 600, #C4B5FD
    Label:         Fornavn, 11px, 0.3 alpha

  Kontakt uten ring:
    Bakgrunn:      rgba(255,255,255, 0.06)
    Tekst:         Initialer, 17px, weight 600, 0.35 alpha
    Label:         Fornavn, 11px, 0.3 alpha

  Online-prikk:
    Størrelse:     14×14px
    Farge:         #34D399
    Border:        3px solid #0E0E12
    Posisjon:      Absolutt, top 40px, right 2px
```

#### Filterpiller

```
Layout:            Flex, 6px gap
Plassering:        Under avatar-rekke, høyrejustert

Aktiv:
  Bakgrunn:        rgba(124,58,237, 0.15)
  Tekstfarge:      #A78BFA
  Font:            12px, weight 600
  Padding:         5px 14px
  Radius:          12px

Inaktiv:
  Bakgrunn:        rgba(255,255,255, 0.04)
  Tekstfarge:      rgba(255,255,255, 0.25)
  Font:            12px, weight 500
  Padding:         5px 14px
  Radius:          12px

Alternativer:      "Alle", "Uleste", "Grupper"
```

#### Samtalekort

```
Bakgrunn:          rgba(255,255,255, 0.04)
Border-radius:     18px
Padding:           14px 16px
Margin-bottom:     8px
Layout:            Flex, align-center, 14px gap

Avatar:
  Størrelse:       52×52px
  Border-radius:   50%
  
  Aktiv (lilla):   Gradient bg, #231A38 → #342A50
                   Initialer: 17px, weight 600, #C4B5FD
  
  Standard:        rgba(255,255,255, 0.06)
                   Initialer: 17px, weight 600, 0.4 alpha
  
  Dempet (lest):   rgba(255,255,255, 0.04)
                   Initialer: 17px, weight 600, 0.28 alpha
  
  Slettet:         rgba(255,255,255, 0.03)
                   Initialer: 17px, weight 600, 0.18 alpha
                   Hele kortet: opacity 0.45

  Gruppe-ikon:     SVG, 22px, 0.35 alpha stroke (i stedet for initialer)

Online-prikk (i kort):
  Størrelse:       13×13px
  Farge:           #34D399
  Border:          2.5px solid #111116
  Posisjon:        Absolutt, bottom 1px, right 1px på avatar

Innhold:
  Rad 1:           Flex, space-between
    Navn:          16px, weight 600, hvit, tracking -0.3
    Tid:           12px, 0.22 alpha

  Rad 2:           Flex, space-between, margin-top 4px
    Forhåndsvisning: 14px, 0.32 alpha, ellipsis, max-width 180px
    Badge:         Se under

Ulest-badge:
  Størrelse:       22×22px min
  Bakgrunn:        #7C3AED
  Radius:          50%
  Tekst:           11px, weight 700, hvit

Leveringshaker (i forhåndsvisning):
  Ikon:            Doble haker SVG, 14×10px
  Farge:           0.22 alpha (levert), #34D399 (lest)
  Gap:             5px før tekst

Slettet samtale:
  Hele kortet:     opacity 0.45, bakgrunn rgba(255,255,255, 0.02)
  Tekst:           "samtale slettet", 13px, italic
  Farge:           rgba(239,68,68, 0.55)
  Ikon:            X, 11px, samme farge, 5px gap
```

#### Tab-bar

```
Bakgrunn:          rgba(255,255,255, 0.04)
Border-radius:     22px
Padding:           12px 0 32px (inkl. safe area)
Layout:            Flex, space-around
Margin:            10px 12px 0

Tabs (4 stk):      samtaler, kontakter, sikkerhet, innstillinger

Aktiv tab:
  Ikon:            Fylt SVG, 22px
  Ikon-farge:      #7C3AED (fylt)
  Label:           10px, weight 500, #A78BFA

Inaktiv tab:
  Ikon:            Outline SVG, 22px
  Ikon-farge:      rgba(255,255,255, 0.22) stroke
  Label:           10px, weight 400, rgba(255,255,255, 0.22)
```

---

### 2. Chat-skjerm

#### Chat-header

```
Bakgrunn:          rgba(255,255,255, 0.04)
Border-radius:     20px
Padding:           12px 16px
Margin:            0 16px
Layout:            Flex, space-between, align-center

Venstre:
  Tilbake-pil:     20px, 0.4 alpha stroke, 2px width
  Avatar:          40×40px, gradient bg (#231A38 → #342A50)
                   Initialer: 15px, weight 600, #C4B5FD
  Navn:            16px, weight 600, hvit, tracking -0.2
  Status:          11px, 0.3 alpha
                   Online-prikk: 6×6px, #34D399
                   Tekst: "Aktiv nå · kryptert"
  Gap:             12px (pil → avatar), 12px (avatar → tekst)

Høyre:
  Telefon-ikon:    20px, 0.3 alpha stroke
  Meny-ikon:       3 prikker vertikal, 1.5px radius, 0.3 alpha fill
  Gap:             14px mellom ikoner
```

#### Meldingsbobler

```
Maks bredde:       270px
Padding:           11px 15px
Font:              15px, weight 400, line-height 1.45
Gap mellom bobler: 6px (3px margin-bottom + spacing)

Egen melding (utgående):
  Bakgrunn:        #7C3AED (solid lilla)
  Tekstfarge:      #FFFFFF
  Border-radius:   20px 20px 6px 20px
  Justering:       Høyrejustert

Andres melding (innkommende):
  Bakgrunn:        rgba(255,255,255, 0.06)
  Tekstfarge:      rgba(255,255,255, 0.88)
  Border-radius:   20px 20px 20px 6px
  Justering:       Venstrejustert

Tidsstempel under boble:
  Font:            11px, rgba(255,255,255, 0.18)
  Padding:         4px 6px 0
  Justering:       Matcher boble-side

Leveringsstatus (egne meldinger):
  Enkelt hake:     ✓ 0.18 alpha (sendt)
  Doble haker:     ✓✓ #34D399 (levert/lest)
  SVG:             14×10px
  Gap:             5px etter tidsstempel
```

#### Gruppemelding med alias (anonym gruppe)

```
Innkommende:
  Layout:          Avatar + Boble
  
  Alias-avatar:
    Størrelse:     32×32px
    Radius:        50%
    Bakgrunn:      Tildelt hex-farge fra pool
    Tekst:         Første 2 bokstaver av alias
    Font:          13px, weight 600, #FFFFFF
  
  Alias-navn over boble:
    Font:          12px, weight 600
    Farge:         Samme hex som avatar (men med 0.8 alpha)
    Margin-bottom: 2px
  
  Boble:           Samme som vanlig innkommende

Egen melding i anonym gruppe:
  Samme som vanlig egen boble (lilla)
  Ingen alias vist (du vet det er deg)
```

#### Dato-separator

```
Layout:            Sentrert
Tekst:             "i dag" / "i går" / dato
Font:              11px, rgba(255,255,255, 0.18)
Bakgrunn:          rgba(255,255,255, 0.03)
Padding:           5px 16px
Radius:            12px
Margin:            0 0 10px
```

#### Auto-slett nedtelling

```
Layout:            Sentrert mellom meldinger
Bakgrunn:          rgba(239,68,68, 0.06)
Radius:            12px
Padding:           5px 14px
Layout:            Flex, align-center, 6px gap

Ikon:
  Sirkel:          12px, stroke rgba(239,68,68, 0.45), 1px
  Strek i sirkel:  Fra senter oppover
  Prikk:           0.5px radius, fylt

Tekst:             "meldinger slettes om 23t 58m"
Font:              11px, rgba(239,68,68, 0.55)
```

#### Anonym-badge (i anonym gruppe)

```
Plassering:        Nederst i chat, over inputfelt
Bakgrunn:          rgba(124,58,237, 0.08)
Border:            0.5px solid rgba(124,58,237, 0.15)
Radius:            12px
Padding:           8px 16px
Tekst:             'Du er anonym i denne gruppen som "Falcon"'
Font:              13px, #A78BFA
```

#### Lydmelding

```
Boble:             Samme bakgrunn som vanlig (lilla eller grå)
Layout:            Flex, align-center, 12px gap

Play-knapp:
  Størrelse:       36×36px
  Bakgrunn:        rgba(255,255,255, 0.06)
  Radius:          50%
  Ikon:            Trekant (play), 14px, rgba(167,139,250, 0.7)

Waveform:
  Bar-bredde:      2.5px
  Bar-gap:         2px
  Bar-høyde:       4-18px (varierende, tilfeldig)
  Bar-farge:       rgba(167,139,250, 0.25) til rgba(167,139,250, 0.6)
  Bar-radius:      1px
  Antall bars:     ~14 stk

Varighet:
  Font:            11px, rgba(255,255,255, 0.28)
  Margin-top:      2px
```

#### Input-felt (bunnen)

```
Padding:           10px 16px 38px (safe area)
Layout:            Flex, align-center, 10px gap

Vedlegg-knapp:
  Størrelse:       34×34px
  Bakgrunn:        rgba(255,255,255, 0.05)
  Radius:          50%
  Ikon:            Pluss, 16px, 0.28 alpha stroke

Tekstfelt:
  Bakgrunn:        rgba(255,255,255, 0.05)
  Radius:          22px
  Padding:         10px 16px
  Placeholder:     "Melding...", 15px, 0.22 alpha
  Layout:          Flex, space-between
  Mikrofon-ikon:   Høyre side, 18px, 0.2 alpha stroke

Send-knapp:
  Størrelse:       34×34px
  Bakgrunn:        #7C3AED
  Radius:          50%
  Ikon:            Pil høyre, 16px, hvit, 2.2px stroke
```

---

### 3. Sikkerhetspanel

#### Seksjon-gruppering

```
Bakgrunn:          rgba(255,255,255, 0.04)
Radius:            18px
Padding:           0

Enkelt rad:
  Padding:         14px 16px
  Layout:          Flex, space-between, align-center
  
Separator mellom rader:
  Høyde:           0.5px
  Farge:           rgba(255,255,255, 0.06)
  Margin:          0 16px

Ikon (venstre):
  Størrelse:       22px
  Farge:           Avhenger av type (se under)
  Gap:             14px til tekst

Chevron (høyre):
  Størrelse:       16px
  Farge:           rgba(255,255,255, 0.15)

Toggle (av/på):
  Størrelse:       44×26px
  Aktiv bg:        #34D399
  Inaktiv bg:      rgba(255,255,255, 0.1)
  Knott:           22×22px, hvit, radius 50%
```

#### Faresone (Remote Wipe)

```
Seksjonstittel:
  Tekst:           "FARESONE"
  Font:            12px, weight 600, tracking 0.5px, uppercase
  Farge:           #EF4444

Kort-bakgrunn:     rgba(255,255,255, 0.04) (samme som vanlig)

Wipe-ikon:
  Størrelse:       32×32px
  Bakgrunn:        rgba(239,68,68, 0.12)
  Radius:          8px
  Ikon:            22px, #EF4444 stroke

Wipe-tekst:
  Tittel:          15px, #EF4444
  Undertekst:      11px, rgba(255,255,255, 0.35)

Nødknapp (slett alt):
  Tittel:          15px, weight 600, #EF4444
  Ikon-bakgrunn:   rgba(239,68,68, 0.2) (sterkere)
  Undertekst:      "Nødknapp — krever 2FA-bekreftelse"
```

#### Enhetskort

```
Enhet-ikon:        22px, stroke
  Aktiv enhet:     #34D399 stroke
  Annen enhet:     0.35 alpha stroke

"Denne" badge:
  Font:            10px, weight 600
  Bakgrunn:        rgba(52,211,153, 0.12)
  Farge:           #34D399
  Padding:         2px 8px
  Radius:          6px
```

---

### 4. Opprett gruppe-skjerm

#### Gruppetype-velger

```
Layout:            2 kort side om side, 50% bredde, 12px gap
Høyde:             ~90px

Valgt:
  Border:          2px solid #7C3AED
  Bakgrunn:        rgba(124,58,237, 0.08)
  Radius:          16px
  Ikon-farge:      #A78BFA

Ikke valgt:
  Border:          0.5px solid rgba(255,255,255, 0.08)
  Bakgrunn:        rgba(255,255,255, 0.03)
  Radius:          16px
  Ikon-farge:      rgba(255,255,255, 0.3)

Tittel:            14px, weight 600
Ikon:              24px, sentrert over tittel

"Kan ikke endres" advarsel:
  Bakgrunn:        rgba(245,158,11, 0.06)
  Border:          0.5px solid rgba(245,158,11, 0.12)
  Farge:           rgba(245,158,11, 0.7)
  Font:            12px
  Radius:          10px
  Padding:         8px 14px
  Margin-top:      12px
```

#### Opprett-knapp

```
Bredde:            100%
Bakgrunn:          #7C3AED
Radius:            14px
Padding:           14px
Tekst:             "Opprett gruppe", 16px, weight 600, hvit
Deaktivert:        opacity 0.4 (når navn mangler eller ingen medlemmer)
```

---

### 5. Admin-badge

```
Tekst:             "admin"
Bakgrunn:          rgba(245,158,11, 0.12)
Farge:             #F59E0B
Font:              10px, weight 600
Radius:            6px
Padding:           2px 8px
```

---

## Dynamic Island / Notch

```
Størrelse:         126px bred, 34px høy
Bakgrunn:          rgba(0,0,0, 0.5)
Radius:            0 0 20px 20px
Posisjon:          Sentrert, toppen av skjermen
```

## Telefon-ramme (for mockups)

```
Bredde:            375px
Høyde:             812px
Radius:            40px
Border:            2px solid #1C1C1E
Bakgrunn:          Lineær gradient 175deg:
                     #0C0C10 (0%) → #111116 (50%) → #14141C (100%)
```

---

## Ikoner (SVG, outline-stil)

Alle ikoner er outline med disse defaults:

```
Stroke-width:      1.5px
Stroke-linecap:    round
Stroke-linejoin:   round
Fill:              none
Størrelse:         20-22px (navigasjon), 16-18px (inline)

Ikonsett brukt:
  Samtaler:        Chat-boble med hale
  Kontakter:       Person med pluss
  Sikkerhet:       Hengelås
  Innstillinger:   Tannhjul
  Søk:             Lupe
  Ny samtale:      Pluss i firkant
  Tilbake:         Chevron venstre
  Telefon:         Telefonrør
  Meny:            3 vertikale prikker
  Send:            Pil høyre
  Vedlegg:         Pluss i sirkel
  Mikrofon:        Mikrofon
  Play:            Trekant (fylt)
  Slett:           Søppelbøtte
  Kryss:           X
  Hake:            Checkmark
  Doble haker:     2× checkmark
  Gruppe:          2 personer
  Advarsel:        Sirkel med utropstegn
```

---

## Animasjoner

```
Kort-trykk:        scale(0.98), 100ms ease
Boble inn:         fadeIn + translateY(8px), 200ms ease-out
Send-knapp:        scale(0.9) → scale(1), 150ms
Tab-bytte:         Ikon crossfade, 200ms
Online-prikk:      Ingen animasjon (statisk)
Wipe-bekreftelse:  Rød puls-ring, 2s infinite
```

---

## Spacing-system

```
4px      Micro (ikon-tekst gap i badges)
6px      Tight (mellom filterpiller)
8px      Small (mellom samtalekort)
10px     Medium-small (tab-bar padding, input gap)
12px     Medium (avatar-tekst gap i header)
14px     Medium-large (avatar-tekst gap i kort)
16px     Large (horisontal padding, mellom seksjoner)
18px     XL (avatar-rekke topp-padding)
20px     XXL (mellom seksjoner)
32px     Safe area (tab-bar bunn)
38px     Safe area (input bunn)
42px     Top safe area (under notch)
```

---

## Responsivitet

```
Designet er laget for 375px bredde (iPhone).
For bredere skjermer:
  - Maks innholdsbredde: 428px (iPhone Pro Max)
  - Sentrert med PrimaryBg på sidene
  - Kort og bobler skalerer ikke — bare mer whitespace
  - Tab-bar strekker seg til full bredde

For tablet/desktop (MAUI):
  - Split-view: Samtaleliste (320px fast) + Chat (resten)
  - Samme farger og komponentstiler
  - Større touch-targets er ikke nødvendig (mus/trackpad)
```
