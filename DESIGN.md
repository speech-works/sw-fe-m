---
name: Speechworks Vivid
description: >-
  Speechworks' dark-first "Vivid" design system. A warm, low-glare dark canvas
  with a single brand orange and a family of energetic accents. Brand shows
  through accents, never floods; every bright fill carries dark ("dark-on-bright")
  ink for AA contrast. Built for React Native (iOS + Android identical), driven by
  a three-layer token architecture (primitives → semantic roles → components).
scheme: dark
brand:
  voice: Warm, encouraging, calm, human. Celebrates effort over outcome.
  primary: "#FF9040"
  personality: [warm, lively, calm, confident, low-glare]
fontFamily:
  base: Inter
  weights:
    regular: Inter_400Regular
    medium: Inter_500Medium
    semibold: Inter_600SemiBold
    bold: Inter_700Bold
    extrabold: Inter_800ExtraBold

# ─────────────────────────────────────────────────────────────────────────────
# COLORS — semantic roles resolved to concrete hex (dark "Vivid" scheme).
# These are the runtime tokens every screen consumes via useTheme().colors.*
# No screen ever uses a raw hex; it reads a role below.
# ─────────────────────────────────────────────────────────────────────────────
colors:
  background:
    canvas: "#141311"      # app background — the dominant surface
    raised: "#1C1A17"      # panels raised off the canvas
    sunken: "#0E0D0B"      # wells / recessed areas
  surface:
    default: "#24211B"     # cards & rounded groups (e1)
    elevated: "#2E2A24"    # rows, elevated cards
    row: "#2E2A24"         # list/settings rows
    rowSelected: "#FF9040" # a selected row flips to the orange fill
    control: "#393430"     # segmented controls, control chips
    inverse: "#FFFFFF"     # a bright white disc — avatars, switch thumbs
    material: "rgba(42,38,31,0.82)" # translucent blur tint for floating chrome
  border:
    hairline: "rgba(255,255,255,0.06)"
    default: "rgba(255,255,255,0.08)"
    strong: "rgba(255,255,255,0.12)"
    selected: "#FF9040"
    focus: "#FF9040"
  text:
    primary: "#FFFFFF"
    secondary: "#ADA7A0"
    tertiary: "#9E988F"    # AA on card surfaces only — not on 'control'
    disabled: "#5C574F"
    inverse: "#2A1505"     # dark ink that sits ON the orange/brand fill
    onInverse: "#141311"   # near-black ink on the white 'surface.inverse' disc
    link: "#FFB580"
  action:
    primary: "#FF9040"           # the orange CTA
    primaryPressed: "#FF6B00"
    primaryTint: "rgba(255,144,64,0.12)" # faint orange wash for soft chips (not a fill)
    onPrimary: "#2A1505"         # dark ink on the orange fill (AA)
    secondary: "#2E2A24"         # solid dark island button
    onSecondary: "#FFFFFF"
    disabledBg: "#24211B"
    disabledText: "#5C574F"
  accent:                        # bright accent FILLS
    lime: "#C8F750"
    purple: "#8B7BF0"
    success: "#5BD98A"
    warning: "#FFC53D"
    danger: "#FF5A5F"
    info: "#5B9DF9"
  accentOn:                      # dark ink/icon that sits ON each accent fill (AA)
    lime: "#20300A"
    purple: "#18123A"
    success: "#08351F"
    warning: "#3A2A00"
    danger: "#3A0608"
    info: "#06203F"
  accentTint:                    # 12% wash for soft chips / icon-bg on dark (not a fill)
    lime: "rgba(200,247,80,0.12)"
    purple: "rgba(139,123,240,0.12)"
    success: "rgba(91,217,138,0.12)"
    warning: "rgba(255,197,61,0.12)"
    danger: "rgba(255,90,95,0.12)"
    info: "rgba(91,157,249,0.12)"
  feedback:                      # fills = accent base; *Text = lighter, for text on dark
    success: "#5BD98A"
    warning: "#FFC53D"
    danger: "#FF5A5F"
    info: "#5B9DF9"
    successText: "#7DE6A3"
    warningText: "#FFD66B"
    dangerText: "#FF9296"
    infoText: "#8FBEFF"
  overlay:
    scrim: "rgba(0,0,0,0.62)"           # modal / sheet backdrop
    pressed: "rgba(255,144,64,0.16)"    # orange press wash
  input:
    bg: "#201E1A"
    border: "#423D37"
    borderFocus: "#FF9040"
    placeholder: "#9E988F"
    error: "#FF5A5F"
  nav:
    capsule: "rgba(42,38,31,0.74)"      # floating tab-bar capsule
    activePill: "#FF9040"
    onActive: "#2A1505"
    inactive: "#9E988F"
    badge: "#FF5A5F"
  category:                      # activity-family hues (muted, legible as icon-tint)
    reading: "#5FB3AB"           # teal
    breathing: "#A2B57E"         # sage
    mirror: "#B084AA"            # plum
    exposure: "#C9805F"          # terracotta
    fun: "#D6B86F"               # sand
    realLife: "#CB8398"          # rose
  categoryOn:                    # dark ink on a full category fill (AA)
    reading: "#06302C"
    breathing: "#1E2A0E"
    mirror: "#2E1B2A"
    exposure: "#3A1B0E"
    fun: "#3A2C0A"
    realLife: "#2E1119"
  gamification:
    xp: "#C8F750"                # lime
    streak: "#FF9040"            # orange
    stamina: "#5B9DF9"           # info blue
    gold: "#FFC53D"             # warning gold
  premium:                       # gold-on-slate tier — scoped to the BuyPro upsell only
    gold: "#D4AF37"
    goldDeep: "#996515"
    goldTint: "rgba(212,175,55,0.15)"
    goldBorder: "rgba(212,175,55,0.3)"
    orbCyan: "#22D3EE"
    orbPurple: "#8B5CF6"
  shadow: "#000000"

# Brand orange ramp (primitive) — semantic roles above resolve from these.
palette:
  orange:
    "100": "#FFF0E5"
    "200": "#FFDABF"
    "300": "#FFB580"
    "400": "#FF9040"   # hero / default CTA
    "500": "#FF6B00"   # pressed
    "600": "#BF5000"
    "700": "#803600"
    "800": "#401B00"
    on: "#2A1505"
  ink:
    canvas: "#141311"
    panel: "#1C1A17"
    card: "#24211B"
    row: "#2E2A24"
    control: "#393430"
    sunken: "#0E0D0B"

# ─────────────────────────────────────────────────────────────────────────────
# TYPOGRAPHY — 10 roles. Consume via <Text variant="…">, never a raw fontSize.
# family maps to a concrete Inter weight (Android ignores numeric fontWeight).
# ─────────────────────────────────────────────────────────────────────────────
typography:
  screenTitle: { fontFamily: Inter_800ExtraBold, fontWeight: "800", fontSize: 38, lineHeight: 44, letterSpacing: -1 }
  display:     { fontFamily: Inter_700Bold,       fontWeight: "700", fontSize: 32, lineHeight: 40, letterSpacing: -0.5 }
  h1:          { fontFamily: Inter_700Bold,       fontWeight: "700", fontSize: 28, lineHeight: 34, letterSpacing: -0.4 }
  h2:          { fontFamily: Inter_700Bold,       fontWeight: "700", fontSize: 22, lineHeight: 28, letterSpacing: -0.2 }
  h3:          { fontFamily: Inter_600SemiBold,   fontWeight: "600", fontSize: 18, lineHeight: 24 }
  title:       { fontFamily: Inter_600SemiBold,   fontWeight: "600", fontSize: 16, lineHeight: 22 }
  body:        { fontFamily: Inter_400Regular,    fontWeight: "400", fontSize: 16, lineHeight: 24 }
  bodySm:      { fontFamily: Inter_400Regular,    fontWeight: "400", fontSize: 14, lineHeight: 20 }
  label:       { fontFamily: Inter_600SemiBold,   fontWeight: "600", fontSize: 13, lineHeight: 16, letterSpacing: 0.3 }  # ALL-CAPS section label
  caption:     { fontFamily: Inter_500Medium,     fontWeight: "500", fontSize: 12, lineHeight: 16 }

# ─────────────────────────────────────────────────────────────────────────────
# SPACING — 4-based ramp + intent aliases (no magic numbers anywhere).
# ─────────────────────────────────────────────────────────────────────────────
spacing:
  none: 0
  xxs: 2
  xs: 4
  sm: 8
  md: 12
  lg: 16
  xl: 20
  "2xl": 24
  "3xl": 32
  "4xl": 40
  "5xl": 48
  "6xl": 64
spacingAliases:
  screenX: 16        # horizontal screen gutter — everywhere
  sectionGap: 24     # between form sections
  groupGap: 16       # between rounded groups/cards
  titleGap: 28       # back-bar → screen title, and title block → first content
  cardPad: 16
  rowGap: 12
  inlineGap: 8
  iconText: 12       # leading icon/avatar → its text
  titleSub: 3        # title → subtitle

# ─────────────────────────────────────────────────────────────────────────────
# RADIUS — role-based (not one-size).
# ─────────────────────────────────────────────────────────────────────────────
radius:
  none: 0
  xs: 4
  sm: 8
  md: 12
  input: 16
  chip: 20
  card: 24
  sheet: 28
  pill: 36
  full: 9999

# ─────────────────────────────────────────────────────────────────────────────
# SIZES — control & layout dimensions.
# ─────────────────────────────────────────────────────────────────────────────
sizes:
  avatar: 64
  avatarCompact: 52
  avatarChip: 48       # leading icon chip inside a row
  control: 56
  row: 72              # standard list/settings row height
  backBtn: 44
  tabBarSafe: 120      # bottom clearance under the floating tab bar
  tabIcon: 24
  iconLg: 28
  icon: 20
  iconSm: 16
  hitTargetMin: 44

borderWidth:
  hairline: hairline   # StyleSheet.hairlineWidth (device-true 1px)
  thin: 1
  thick: 2

opacity:
  full: 1
  muted: 0.7
  pressed: 0.6
  disabled: 0.4
  faint: 0.12

zIndex:
  base: 0
  raised: 1
  sticky: 10
  header: 10
  tabBar: 20
  overlay: 100
  modal: 1000
  toast: 2000

# ─────────────────────────────────────────────────────────────────────────────
# ELEVATION — on dark = surface step + hairline border + optional shadow.
# ─────────────────────────────────────────────────────────────────────────────
elevation:
  e0: { }                                                                 # flat on canvas
  e1: { surface: default, border: hairline }                              # cards (no shadow on dark)
  e2: { shadowColor: "#000", shadowOffsetY: 2,  shadowOpacity: 0.4,  shadowRadius: 8,  androidElevation: 4 }
  e3: { shadowColor: "#000", shadowOffsetY: 12, shadowOpacity: 0.55, shadowRadius: 32, androidElevation: 12 }

# ─────────────────────────────────────────────────────────────────────────────
# MOTION — one animation vocabulary (react-native-reanimated). Reduced-motion is
# mandatory: keep opacity, drop transform; ambient loops go silent.
# ─────────────────────────────────────────────────────────────────────────────
motion:
  duration: { fast: 120, base: 200, reveal: 240, slow: 300, sheetIn: 300, sheetOut: 200, count: 700, shimmer: 1000 }
  easing:
    out: "cubic-bezier(0.23, 1, 0.32, 1)"      # enters, feedback, reveals (default)
    inOut: "cubic-bezier(0.77, 0, 0.175, 1)"   # one-shot on-screen movement / morph
    in: "cubic-bezier(0.32, 0, 0.67, 0)"       # EXITS only
    loop: "ease-in-out"                          # ambient/loading loops
    linear: linear
  spring:
    press:  { mass: 0.4, damping: 14, stiffness: 240 }   # snappy, no overshoot
    gentle: { mass: 0.7, damping: 20, stiffness: 220 }   # sheets, dock morph, layout
    bouncy: { mass: 0.6, damping: 12, stiffness: 200 }   # celebration only
  stagger: { step: 45, max: 6 }
  pressScale: 0.97

# ─────────────────────────────────────────────────────────────────────────────
# GRADIENTS — the "Vivid" identity. colors + direction (0..1 unit square).
# ─────────────────────────────────────────────────────────────────────────────
gradients:
  brand:      { colors: ["#FF9040", "#FF6B00"], direction: diagonal }   # orange CTA / hero
  brandSoft:  { colors: ["#FFB580", "#FF9040"], direction: diagonal }
  sunrise:    { colors: ["#FF9040", "#FF5A5F"], direction: diagonal }   # hero / celebration
  aurora:     { colors: ["#8B7BF0", "#5B9DF9"], direction: diagonal }
  meadow:     { colors: ["#C8F750", "#5BD98A"], direction: diagonal }
  fade:       { colors: ["#1C1A17", "#141311"], direction: vertical }   # section → canvas
  scrimDown:  { colors: ["rgba(20,19,17,0)", "rgba(10,9,7,0.88)"], direction: vertical }
  scrimUp:    { colors: ["rgba(10,9,7,0.7)", "rgba(20,19,17,0)"], direction: vertical }
  sheen:      { colors: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0)"], direction: vertical }
  premiumSlate: { colors: ["#0F172A", "#1E293B", "#0F172A"], direction: diagonal }
  premiumGold:  { colors: ["#D4AF37", "#996515"], direction: diagonal }
---

# Speechworks "Vivid" Design System

A **dark-first, warm** design system for the Speechworks app. One brand orange, a
family of energetic accents, and a low-glare warm-neutral canvas. The brand shows
through **accents, not floods** — and every bright fill carries **dark ink** so
contrast always clears WCAG AA. Built for React Native; iOS and Android render
identically.

> This document describes the **current** system only. Legacy constructs
> (`app/Theme/`, `parseTextStyle`, `colors.library`, and an unshipped light-mode
> stub) are being removed and are intentionally excluded.

---

## 1. Principles

1. **Dark-first, warm.** The canvas is a warm near-black (`#141311`), not a cold
   grey. Surfaces step up in warmth, never in cold grey.
2. **Brand through accents, not floods.** Identity surfaces stay dark with orange
   accents (a level badge, an orange-tint chip, an orange CTA) — never a fully
   orange-filled card with dark content.
3. **Dark-on-bright is the AA rule.** Never white text/icons on a bright fill.
   Every bright fill (orange, accents, category hues) has a matching **dark**
   foreground token (`onPrimary`, `accentOn.*`, `categoryOn.*`).
4. **Tokens only.** No color hex, `rgba()`, or named colors outside the palette
   primitive. No magic numbers for spacing, radius, or size — there is a token.
5. **One of everything.** One title pattern, one gutter, one row scale, one icon
   family, one motion vocabulary. Consistency is enforced by shared components.
6. **Reuse over re-roll.** Reach for an existing component before hand-rolling
   markup; the library covers actions, inputs, data display, overlays, feedback,
   and layout.

---

## 2. Color system

### 2.1 Architecture (3 layers)
- **Primitives** (`palette.ts`) — raw hex; the *only* file allowed color literals.
- **Semantic roles** (`SemanticColors`, resolved by the dark scheme) — what
  screens consume at runtime via `useTheme().colors.*`. Scheme-swappable by design.
- **Components** — read semantic roles; never import the palette.

### 2.2 Neutral "ink" ramp (surfaces & text)
Warm, not grey. Surfaces step up from the canvas; text steps down in brightness.

| Role | Hex | Use |
|---|---|---|
| `background.canvas` | `#141311` | App background (dominant) |
| `background.raised` | `#1C1A17` | Panels raised off canvas |
| `background.sunken` | `#0E0D0B` | Wells / recessed areas |
| `surface.default` | `#24211B` | Cards & rounded groups |
| `surface.elevated` / `row` | `#2E2A24` | Rows, elevated cards |
| `surface.control` | `#393430` | Segmented controls, control chips |
| `surface.inverse` | `#FFFFFF` | Bright white disc (avatars, switch thumbs) |
| `text.primary` | `#FFFFFF` | Primary text |
| `text.secondary` | `#ADA7A0` | Secondary text |
| `text.tertiary` | `#9E988F` | Meta text — **AA on card surfaces only** |
| `text.disabled` | `#5C574F` | Disabled text |

### 2.3 Brand orange
Hero fill `#FF9040`, pressed `#FF6B00`, dark ink-on-orange `#2A1505`.

| Role | Hex |
|---|---|
| `action.primary` | `#FF9040` |
| `action.primaryPressed` | `#FF6B00` |
| `action.onPrimary` (ink on orange) | `#2A1505` |
| `action.primaryTint` (soft wash) | `rgba(255,144,64,0.12)` |
| `text.link` | `#FFB580` |

### 2.4 Energy accents
Each accent ships **three** roles: a bright `accent.*` **fill**, a dark
`accentOn.*` **ink** for text/icons on that fill, and a 12% `accentTint.*` **wash**
for soft chips on dark. Colored *text on a dark surface* uses the lighter
`feedback.*Text` variant instead of the bright fill.

| Accent | Fill (`accent`) | Ink on fill (`accentOn`) | Text-on-dark (`feedback.*Text`) |
|---|---|---|---|
| Lime | `#C8F750` | `#20300A` | `#C8F750` |
| Purple | `#8B7BF0` | `#18123A` | `#B5A8F5` |
| Success | `#5BD98A` | `#08351F` | `#7DE6A3` |
| Warning | `#FFC53D` | `#3A2A00` | `#FFD66B` |
| Danger | `#FF5A5F` | `#3A0608` | `#FF9296` |
| Info | `#5B9DF9` | `#06203F` | `#8FBEFF` |

### 2.5 Category hues (activity families)
Muted, legible as an icon-tint on the card surface. Each has a dark `categoryOn.*`
for full fills.

| Family | Fill | Ink on fill | Character |
|---|---|---|---|
| Reading | `#5FB3AB` | `#06302C` | teal |
| Breathing | `#A2B57E` | `#1E2A0E` | sage |
| Mirror | `#B084AA` | `#2E1B2A` | plum |
| Exposure | `#C9805F` | `#3A1B0E` | terracotta |
| Fun | `#D6B86F` | `#3A2C0A` | sand |
| Real Life | `#CB8398` | `#2E1119` | rose |

### 2.6 Domain roles
- **Gamification:** XP `#C8F750` (lime) · Streak `#FF9040` (orange) · Stamina
  `#5B9DF9` (info) · Gold `#FFC53D`.
- **Nav (floating tab bar):** capsule `rgba(42,38,31,0.74)`, active pill `#FF9040`,
  ink-on-active `#2A1505`, inactive `#9E988F`, badge `#FF5A5F`.
- **Premium tier (BuyPro upsell only):** a deliberately *separate* gold-on-slate
  identity — gold `#D4AF37`, deep gold `#996515`, slate container. **Not** part of
  the orange system; do not use elsewhere.

### 2.7 Contrast rules (load-bearing)
- **Never white on a bright fill.** Use the matching dark foreground role.
- **Tinted chips need real contrast.** A 12% tint over a dark card is nearly the
  card color — never put accent-colored text on `accentTint.*`. A "selected" chip
  uses a **solid** fill (`action.primary`) + its `onPrimary` ink.
- **`text.tertiary` clears AA only on card surfaces** (`default`/`elevated`/
  `canvas`), **not** on the lighter `surface.control` — use `text.secondary` there.
- **Selected/bright rows flip their subtitles to dark ink** too.
- **On a bright accent surface, separate content from actions by SHAPE:** content =
  borderless dark ink printed straight on the fill; actions = enclosed shapes
  (solid dark island Button, or `outline` with `onColor`). No `ghost` buttons on a
  bright fill. Tertiary/nav actions become an underlined `TextLink`. A `Divider`
  on a bright fill needs `color={accentOn…}` (the default hairline is invisible).
- **Dynamic backgrounds** pick their foreground with helpers, never by eye:
  `onColor(bg)`, `bestForeground(bg, [...])`, `meetsAA(fg, bg)`,
  `contrastRatio(fg, bg)`, `assertContrast(fg, bg, label)`. AA = 4.5:1 (3:1 for
  large/bold ≥18.66px).

---

## 3. Typography

Family: **Inter**, five weights. Every type role pairs a concrete family name with
its weight (Android ignores numeric `fontWeight`). Consume via `<Text variant="…">`
— never a raw `fontSize`.

| Variant | Size / Line | Weight | Role |
|---|---|---|---|
| `screenTitle` | 38 / 44 | 800 | Home / hero title only |
| `display` | 32 / 40 | 700 | Big numbers, splash |
| `h1` | 28 / 34 | 700 | Screen title (via `Page`) |
| `h2` | 22 / 28 | 700 | Major section |
| `h3` | 18 / 24 | 600 | Card / section header |
| `title` | 16 / 22 | 600 | Row / control label |
| `body` | 16 / 24 | 400 | Body text |
| `bodySm` | 14 / 20 | 400 | Secondary body |
| `label` | 13 / 16 | 600 | **ALL-CAPS** section/form label (tertiary) |
| `caption` | 12 / 16 | 500 | Meta |

**Roles:** `screenTitle` = Home/hero · `h1` = screen title · `h2` = major section ·
`h3` = card header · `title` = row/control · `body`/`bodySm` = text · `label` =
all-caps label · `caption` = meta.

---

## 4. Spacing, layout & shape

### 4.1 Spacing
4-based ramp: `2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`. Intent aliases
keep rhythm identical everywhere:

| Alias | px | Use |
|---|---|---|
| `screenX` | 16 | Horizontal screen gutter (everywhere) |
| `titleGap` | 28 | Back-bar → title, and title → first content |
| `sectionGap` | 24 | Between form sections |
| `groupGap` | 16 | Between rounded groups/cards |
| `cardPad` | 16 | Card interior padding |
| `rowGap` | 12 | Between rows |
| `iconText` | 12 | Leading icon/avatar → text |
| `inlineGap` | 8 | Inline items |
| `titleSub` | 3 | Title → subtitle |

### 4.2 Layout constitution
1. **One title pattern:** large left-aligned `h1` screen title (via `Page`) with a
   compact back bar above and `titleGap` (28) before content. No centered nav
   titles on product screens. `screenTitle` (38) = Home/hero only.
2. **One gutter:** `screenX` (16) horizontal everywhere (Page applies it).
3. **Vertical rhythm** from tokens: title→content 28 · between groups 16 (24 for
   form sections) · title→subtitle 3 · icon→text 12.
4. **One row scale:** standard row = **72** (`ListItem`, `ConnectedAvatarRow`); a
   compact 56 variant only where dense.
5. **Floating tab-bar clearance:** the tab bar floats over content and shows only
   on tab-**root** screens. Those pass `tabBarSafe` (120) to `Page`; pushed screens
   never do.

### 4.3 Radius (role-based)
`input` 16 · `chip` 20 · `card`/group 24 · `sheet` 28 · `pill`/button 36 · `full` 9999.

### 4.4 Elevation
On dark, elevation = **surface step + hairline border + optional shadow** (shadows
for true overlays only). `e1` = card surface + hairline, **no shadow**. `e2`/`e3`
add shadows for menus/sheets. Never ad-hoc `shadow*`; shadow color is the `shadow`
role (`#000`). Android pairs iOS `shadow*` with `elevation`.

---

## 5. Motion

One vocabulary; all motion is `react-native-reanimated`. **Reduced-motion is
mandatory** — reduced keeps opacity and drops transform/position; ambient loops go
fully silent.

- **Duration (ms):** `fast 120` · `base 200` · `reveal 240` · `sheetIn 300` /
  `sheetOut 200` (exit faster than enter) · `count 700` · `shimmer 1000`.
- **Easing:** `out` for enters/feedback/reveals (default) · `inOut` for one-shot
  movement/morph · `in` for **exits only** · `loop` for ambient breathing.
- **Spring:** `press` (snappy, no overshoot) · `gentle` (sheets, dock morph,
  layout) · `bouncy` (**celebration only**, never on error/neutral).
- **Stagger:** 45ms/item, capped at 6. **Press scale:** 0.97.

### Event taxonomy (one motion per event)
| Event | Motion | Tokens | Reduced |
|---|---|---|---|
| Press (any pressable) | scale 0.97 | `spring.press` | no scale |
| Section/list reveal (once) | fade + 8px up, staggered | `staggerEntering` | fade only |
| Connected-rail reveal | opacity-only stagger | `fadeStaggerEntering` | fade only |
| Sheet / drawer | slide-up + backdrop fade | `sheetIn/out` + `gentle` | backdrop only |
| Centered modal | scale 0.96→1 + fade | `AnimatedModal` (`gentle`) | fade only |
| Dock / tab morph | shared spring resize | `spring.gentle` | instant |
| Toggle | thumb slide + track color | `base` + `easing.out` | instant |
| Value change (XP/days) | count-up | `AnimatedNumber` (`count`) | instant final |
| Loading | shimmer | `Skeleton` (`shimmer` + `loop`) | static |
| Success (save/share) | check/disc pop | `useSuccessPop` (`bouncy`) | fade only |
| Live/fresh indicator | pulse ring loop | `PulseDot` (`loop`) | solid dot |
| List item remove | layout collapse + fade-out | `layoutPreset` + `FadeOut` | fade only |
| Ambient (avatar float) | slow translateY loop | `loop` | disabled |

---

## 6. Iconography

- **Family:** Microsoft **Fluent UI System Icons (filled)**, rendered as SVG
  (`react-native-svg`, viewBox `0 0 24 24`) via `<Icon name=… />`. Icon names are
  kebab-case (Feather/registry vocabulary) mapped to Fluent glyph paths in **one**
  file — swapping the family is a single-file change. Screens never import an icon
  library.
- **One icon per concept — the semantic registry** (`icons.ts`, ~94 keys). Map a
  concept to a single glyph (`icons.win` → `award`, `icons.streak` → `flame`,
  `icons.courage` → `shield`, …) and reference the key, never a raw glyph. Add a
  key before using a new icon so a concept always renders the same icon.
- **Prefer icons over emoji** for content.
- **Sizes:** `iconSm` 16 · `icon` 20 (default control tier) · `iconLg` 28 ·
  `tabIcon` 24.
- Fluent has no brand logos, so `facebook`/`instagram`/`whatsapp` render via a
  scoped FontAwesome exception.

---

## 7. Components

Import everything from one barrel (`app/design-system`). Reach for a component
before hand-rolling markup. ~55 components across six groups.

### 7.1 Layout & chrome
- **`Page`** — the whole-screen wrapper. Owns the dark canvas, the large-title
  header, the screen gutter, the title→content gap, and scroll. Body modes:
  scrolling children (default), a `FlatList` via `list`, or fixed (`scroll={false}`).
  Props: `title`, `onBack`, `description`, `footer` (pinned bottom action),
  `keyboardAvoiding`, `tabBarSafe` (tab-root only). **Never** hand-assemble a
  header + ScrollView + padding.
- **`PageHeader`** — the scrollable large-title header block used inside `Page`.
- **`Screen`** — low-level safe-area canvas wrapper.
- **`Header`** — compact top bar (back arrow + optional actions).
- **`Surface` / `Card`** — the base rounded surface (radius 24, `surface.default`,
  hairline). `Card` is the elevated variant.
- **`Divider`** — hairline separator (`color` overridable for bright fills).
- **`SectionHeader`** — an all-caps `label` section heading.

### 7.2 Data display
- **`Text`** — the only text primitive. `variant` (10 roles) × `color` (role).
- **`Icon`** — Fluent SVG icon by semantic name.
- **`Avatar`** — user/level disc; supports a `level` badge (orange).
- **`Badge`** — small count/status pill.
- **`ListItem`** — the canonical row (72): `leftIcon`, `label`, `sublabel`,
  `showChevron`, `divider`. Group inside a rounded container (`radius.card`,
  `surface.default`, `overflow:hidden`).
- **`ConnectedAvatarRow`** — the paired-buddy bridge row (72); ported geometry —
  do not re-derive.
- **`ProgressBar`** / **`ProgressRing`** — linear / circular progress.
- **`TrendLine`** — the signature line chart (Growth Profile).
- **`AnimatedNumber`** — count-up value.
- **`PulseDot`** — live/fresh indicator (pulse ring loop).
- **`Gradient`** — renders a named gradient token.

### 7.3 Actions
- **`Button`** — variants: `primary` (orange fill + dark ink), `secondary` (solid
  dark island), `outline` (hairline; pass `onColor` on bright fills), `ghost`
  (borderless — **never** on a bright fill). Radius `pill` (36). States:
  default / pressed (0.97 + pressed color) / disabled / loading.
- **`IconButton`** — icon-only tap target (≥44).
- **`Chip`** — compact filter/toggle pill (radius 20). Selected = solid
  `action.primary` + `onPrimary`, never tinted text on a wash.
- **`TextLink`** — underlined inline/navigation action (the third affordance tier
  on bright fills).
- **`FloatingControls`** — floating control cluster (e.g. recorder tools).

### 7.4 Inputs
- **`TextField`** — labeled text input (radius 16, `input.*` roles, focus ring
  orange, error state `input.error`).
- **`SearchField`** — search input with leading icon.
- **`Toggle`** — switch (thumb slide + track color).
- **`Segmented`** — segmented control on `surface.control`.
- **`Slider`** — value slider.
- **`Checkbox`** · **`Radio` / `RadioGroup`** — selection controls.

### 7.5 Overlays
- **`Sheet`** — bottom sheet (slide-up + backdrop; radius `sheet` 28). Runs on the
  RN `Animated` engine (durations tokenized; native curves). Supports a bright
  `color` accent surface (apply the shape-not-tone rule).
- **`Dialog`** — centered modal (routes through `AnimatedModal`: scale 0.96→1 + fade).
- **`AnimatedModal`** — the one centered-modal motion primitive.
- **`TabDock`** — the morphing dock (global-nav ↔ page title).

### 7.6 Feedback & status
- **`Toast` / `Snackbar` / `Banner`** — transient messages on `surface.material`.
- **`Skeleton`** — shimmer loading placeholder.
- **`Spinner`** — indeterminate spinner.
- **`SuccessCheck` / `useSuccessPop`** — success pop (inline `Animated.View` —
  never a second native Modal over a Sheet).
- **`PageControl`** — carousel dots. **`Carousel`** — paged content.
- **`EmptyState`** / **`ErrorState`** — full-surface empty / error placeholders.

---

## 8. Platform & implementation rules

- **RN primitives only** — no web idioms (no hover/cursor/CSS outline, no `px`
  strings, no web-only components). iOS and Android render identically; only
  uncontrolled system chrome differs.
- **Touch targets ≥ 44** (`hitTarget.min`); interactive items ≥ 8px apart; respect
  safe-area insets.
- **Press feedback** reuses `PressableScale` (scale 0.97, reduced-motion aware).
- **No Reanimated layout animations inside a native `<Modal>`** (unreliable on
  Android) — drive in-modal motion from a shared value.
- **One import path:** everything comes from the `app/design-system` barrel —
  `useTheme`, `makeStyles`, the token scales, and every component.

---

## 9. What is NOT part of this system (excluded remnants)

- Legacy `app/Theme/` (`theme`, `parseTextStyle`, `parseShadowStyle`,
  `colors.library`) — being removed; never referenced here.
- **Light mode** — an unshipped stub that currently mirrors dark; the dark scheme
  is the system. Semantic roles are structured so light is a future value-swap.
- FontAwesome / MaterialCommunity icon usages — scoped legacy/brand exceptions
  during migration, not the icon system (which is Fluent).
