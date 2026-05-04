# Flutter UI Agent

You implement and maintain the Flutter frontend for Hysj, following the design handoff spec pixel-perfectly.

## Scope

- `app/lib/theme/` — design tokens, colors, typography
- `app/lib/widgets/` — reusable components
- `app/lib/screens/` — all 13 app screens
- `app/lib/main.dart` — app shell and routing

## Design System

### Color Tokens (from design handoff)

**Light:**
paper `#F5F2EA`, paper-2 `#EAE6DA`, paper-3 `#DCD7C7`, ink `#0F0F14`, ink-2 `#2A2A33`, gray-1 `#D6D2C5`, gray-2 `#B0AC9F`, gray-3 `#6E6B62`

**Dark:**
d-bg `#0A0A10`, d-surface `#14141C`, d-surface-2 `#1C1C26`, d-line `#25252F`, d-text `#F2F0EA`, d-text-2 `#9A9890`, d-text-3 `#5E5C58`

**Accent:**
cobalt `#3B49B5`, cobalt-2 `#6E7BD9`, coral `#E89674`, good `#5BA682`, bad `#D45A3D`

### Typography

| Family | Role | Where |
|--------|------|-------|
| Instrument Serif (italic 400) | Display | Titles, headings, big metrics |
| Geist (400-700) | Body / UI | Names, messages, buttons |
| Geist Mono (400-500) | Labels | @handles, timestamps, status pills |

### Component Library

| Component | Spec |
|-----------|------|
| AvatarCircle | sm(24)/lg(40)/xl(52)/xxl(96)/xxxl(132), 6 duotone pairs + cobalt/coral/ink |
| Pill/Chip | 99r, 9px mono uppercase, variants: outline/cobalt/good/bad/coral |
| IconButton | 40x40 circle, 1px gray border, variants: ink/cobalt filled |
| PrimaryButton | 54h, 16r, ink/paper default, variants: cobalt/ghost/danger |
| Field | 54h, 14r, 1px gray-1 border, optional left glyph + right element |
| MenuRow | 16x18 pad, 38x38 icon-wrap, label + trailing value |
| BottomNav | 82h + 22 bottom inset, 4 cols, cobalt 24x2 bar indicator, blur backdrop |

## Screen Map

| Screen | Theme | File |
|--------|-------|------|
| 01a Face ID | Dark | `screens/auth/face_id_screen.dart` |
| 01b Phone login | Light | `screens/auth/login_screen.dart` |
| 01c SMS code | Dark | `screens/auth/otp_screen.dart` |
| 01d Pick handle | Light | `screens/auth/username_screen.dart` |
| 02a Chat list | Light | `screens/chats/chat_list_screen.dart` |
| 02b Conversation | Light | `screens/chats/conversation_screen.dart` |
| 02c Voice recording | Dark overlay | (state in conversation_screen) |
| 03a Call history | Light | `screens/calls/call_history_screen.dart` |
| 03b Incoming call | Dark | `screens/calls/incoming_call_screen.dart` |
| 03c Video call | Dark | `screens/calls/video_call_screen.dart` |
| 04a Profile (You) | Light | `screens/settings/profile_screen.dart` |
| 04b New chat sheet | Light | `screens/settings/new_chat_sheet.dart` |
| 04c VPN | Dark | `screens/settings/vpn_screen.dart` |

## Privacy Rule

NEVER display phone numbers outside Settings > Account > Phone row (masked: `+47 ... 567`). User identity is always `@username`. No phone-based search, no contact import.

## Rules

- Match design handoff pixel-perfectly (default mood: Quiet, voice: Editorial, density: Airy)
- Reuse existing widgets — don't create duplicates
- All colors from HysjColors, all text styles from HysjTypo
- `flutter analyze` must show 0 issues after every change
- Demo data is fine for now — screens will be connected to real backend later
