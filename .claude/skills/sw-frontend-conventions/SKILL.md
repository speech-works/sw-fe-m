---
name: sw-frontend-conventions
description: >-
  Speechworks React Native frontend conventions — the "Vivid" design system
  (tokens, components, dark-on-bright AA), mobile-first rules, behavior-frozen
  migrations, and protected zones. Use whenever creating or editing UI code under
  `app/` (any .tsx/.ts touching components, screens, styles, colors, theming,
  fonts, spacing, or layout), and especially when migrating a legacy screen to
  the design system.
---

# Speechworks frontend conventions

The app is mid-migration to a dark-first "Vivid" design system in
`app/design-system/`. Every new or edited UI surface must consume it. The legacy
`app/Theme/` (`theme`, `parseTextStyle`, `parseShadowStyle`, `colors.library`)
is being removed — never add new usages of it.

## The one import path

Everything comes from the barrel:

```ts
import {
  useTheme, makeStyles,           // theming
  spacing, space, radius, size, borderWidth, opacity, zIndex, hitTarget,
  typography, fonts, elevation, gradients, duration, easing, press, haptics,
  Text, Button, IconButton, Chip, Surface, Card, ListItem, ConnectedAvatarRow,
  Avatar, Badge, Divider, ProgressBar, ProgressRing, Gradient,
  TextField, SearchField, Toggle, Segmented, Slider, Checkbox, Radio, RadioGroup,
  Sheet, Dialog, Toast, Snackbar, Banner, Skeleton, Spinner, PageControl,
  EmptyState, ErrorState, Screen, Header,
} from "app/design-system"; // or the correct relative path
```

Reach for an existing component before hand-rolling markup. The full library
already covers actions, inputs, data display, overlays, feedback, and layout.

**Never hand-roll shared chrome — it drifts.** The big ones:
- **Whole screens**: always render `<Page title="…" onBack={…}>…</Page>` — never
  hand-assemble `ScreenView` + header + `ScrollView` + padding. `Page` owns the
  dark canvas, the large-title header, the screen gutter, the title→content gap,
  and scroll. Body modes: scrolling children (default), a `FlatList` via the
  `list` prop, or fixed (`scroll={false}`). Forms pass `keyboardAvoiding`; a
  pinned bottom action goes in `footer`; an intro line goes in `description`.
- **Settings/list rows**: always `<ListItem leftIcon … label … sublabel …
  showChevron divider />` inside a rounded group (`radius.card` on
  `surface.default`, `overflow:"hidden"`). Don't re-create the icon-chip +
  title/subtitle + chevron row by hand.

## Layout constitution (consistency rules — `Page` enforces most automatically)
1. **One title pattern:** large left-aligned `h1` screen title (via `Page`), with
   a compact back bar above and `space.titleGap` (28) before content. No centered
   `h3` nav titles on product screens. `screenTitle` (38) = Home/hero only.
2. **One gutter:** `space.screenX` (16) horizontal everywhere (Page applies it) —
   matches the rest of the app (Home, etc.).
3. **Vertical rhythm (tokens, no magic numbers):** title→content = `space.titleGap`
   (28); between groups/cards = `space.groupGap` (16) default / `space.sectionGap`
   (24) for form sections; title→subtitle = `space.titleSub` (3); icon→text =
   `space.iconText` (12).
4. **One row scale:** standard row = `size.row` (72). `ListItem` and
   `ConnectedAvatarRow` are both 72; use the compact 56 variant only where dense.
5. **Type roles:** `screenTitle`=Home/hero · `h1`=screen title · `h2`=major section
   · `h3`=card/section header · `title`=row/control · `body`/`bodySm`=text ·
   `label`=ALL-CAPS section/form label (tertiary) · `caption`=meta.
6. **Surfaces & radius:** cards/groups `radius.card` (24); inputs `radius.input`
   (16); chips `radius.chip` (20); buttons `radius.pill` (36).
7. **Hero / identity surfaces = dark + orange accents, NOT an orange flood.**
   The brand shows through accents — the orange level badge (`<Avatar level>`),
   an orange-tint chip (`action.primaryTint`), and an **orange (`primary`) CTA
   button** — never a fully orange-filled card with dark content (that fights the
   dark-with-orange language). Two cases:
   - **Entry hero on a screen** (e.g. the Settings hub profile card): a flat
     `surface.elevated` card (no border, no elevation — those read as redundant
     chrome) with an orange CTA.
   - **Identity inside a Sheet/detail** (e.g. View Profile): **free-floating** —
     avatar + name directly on the sheet surface, no nested card wrapper (a card
     on a card just doubles the surface).
8. **Floating tab bar clearance.** The `CustomTabBar` floats over content and
   shows ONLY on tab-ROOT screens (Home/Explore/Community/Settings hub) — it's
   hidden on every pushed screen (`getTabBarVisibility`). On a tab-root screen,
   pass **`tabBarSafe`** to `<Page>` so the scroll body reserves `size.tabBarSafe`
   and bottom content (log out, footers, last rows) stays reachable above the
   dock. Do NOT set it on pushed screens (they'd get dead bottom whitespace).

## Colors — tokens only, AA always

- **No color literals outside `app/design-system/primitives/palette.ts`.** No
  hex, no `rgba(...)`, no named colors in components/screens. The only allowed
  raw color in app code is a `#000` shadow on a shadow prop.
- **Read colors from `useTheme().colors.*` roles** (runtime, scheme-swappable).
  Never import `palette` into a screen.
- **Dark-on-bright is the AA rule.** Never put white text/icons on a bright fill
  (orange, accents, category hues). Use the matching dark foreground role:
  - on the orange/primary fill → `action.onPrimary` (or `text.inverse`)
  - on an accent fill (success/danger/…) → `accentOn.{success|danger|…}`
  - on a category fill → `categoryOn.{reading|…}`
  - on the white avatar/disc (`surface.inverse`) → `text.onInverse`
- **Colored text ON a dark surface** uses the lighter `feedback.*Text` variants
  (e.g. `feedback.successText`), NOT the bright `accent.*` fill.
- A selected/bright row must flip its subtitle/secondary text to a dark
  foreground too — don't let an accent override survive onto a bright fill.
- **Tinted chips need real contrast.** A 12% `accentTint.*` wash over a dark card
  is nearly the card color — never put accent-colored text on `accentTint.*`
  (e.g. orange text on `action.primaryTint` ≈ 1.5:1). For a "selected" chip on a
  bright/dark card, use a SOLID fill (`action.primary`) + its `onPrimary` text.
- **When the background is dynamic/computed** (not a known accent→accentOn pair),
  pick the foreground with the contrast helpers, never by eye:
  - `onColor(bg, colors)` → the legible ink (light vs dark) for any fill.
  - `bestForeground(bg, [a, b, …])` → highest-contrast option from a set.
  - `meetsAA(fg, bg)` / `contrastRatio(fg, bg)` → assert/measure (AA = 4.5:1, or
    3:1 for large/bold ≥18.66px). `assertContrast(fg, bg, label)` warns in `__DEV__`.
  - All exported from `app/design-system` (impl in `utils/contrast.ts`).
- **`text.tertiary` clears AA only on the card surfaces** (`surface.default`/
  `elevated`/`canvas`), NOT reliably on the lighter `surface.control`. Put tertiary
  text on cards; on `control` chips use `text.secondary` or brighter.
- New color pairings should be checked with `contrastRatio` (a quick node script
  over the token hexes works) before shipping — treat <4.5:1 informational text as
  a bug, not a style choice.
- **On a bright accent surface (a `Sheet color={accent…}`, accent card, etc.),
  separate content from actions by SHAPE, not just tone.** The only AA-legible
  high-contrast island on a bright fill is dark — so if both content and buttons
  go dark, they collide into look-alike pills. The rule:
  - **Content = the only borderless things** — the moment/label/copy as bare
    `accentOn.*` type printed straight on the fill (no card, no pill, no border),
    plus at most a bare `Icon` in `accentOn.*` (NO disc).
  - **Actions = the only enclosed shapes** — a solid dark island
    (`Button variant="secondary"`) for the one loud CTA, and `variant="outline"`
    with `onColor={accentOn…}` for secondary actions (a real hairline boundary).
  - **No `ghost` buttons on a bright fill** — a borderless inked button is visually
    identical to content copy. Pass `onColor` so outline ink is `accentOn.*`,
    never the orange `action.primary` (which dies on gold/blue).
  - **Tertiary / navigation actions = `TextLink` (underlined), not a ghost button.**
    The underline is the third affordance tier — legible as a link, distinct from
    both bare content and pill buttons. Use it only for low-priority/navigational
    actions (step transitions, "back", "more"); a primary or crisis action stays an
    enclosed Button (solid island / outline pill), never a link.
  - A `Divider` on a bright fill needs `color={accentOn…}` — the default
    `border.default` (faint white) renders ~1.3:1 and is invisible.
  - Reference: `app/screens/ShareMoment/index.tsx` confirm sheets.

## Typography, spacing, shape

- Text is always `<Text variant="…" color="…">` — never raw `<RNText>` with a
  hardcoded `fontSize`/`fontWeight`/CSS string, and never `parseTextStyle`.
  Variants: `screenTitle, display, h1, h2, h3, title, body, bodySm, label,
  caption`.
- Font weights are **named families** (`fonts.regular…fonts.extrabold`), never
  numeric `fontWeight` strings in new code.
- Spacing/radius/size from the scales: `spacing` (4-based), `space` (intent
  aliases — `iconText` for leading-icon→text gap, `titleSub` for title→subtitle),
  `radius` (role-based: `input/chip/card/sheet/pill`), `size`. No magic numbers
  for gaps, padding, radius, or icon size — there is a token for it.
- Elevation via `elevation.e0–e3` (surface step + hairline + optional shadow),
  never ad-hoc `shadow*`. Shadow color is the `shadow` role.

## Mobile-first (RN, iOS + Android identical)

- RN primitives only. No web idioms: no hover/cursor/CSS outline, no `px` strings
  for layout, no web-only components.
- Touch targets ≥ 44 (`hitTarget.min`); interactive items ≥ 8px apart; respect
  safe-area insets.
- One branded look on both platforms; only uncontrolled system chrome differs.
  Material/blur via `expo-blur` applied identically (or a token fallback).
- Press feedback: reuse `PressableScale` (scale 0.97, reduced-motion aware) and
  honor `useReducedMotion` for non-essential motion. Motion is a first-class part of
  the DS — see **Motion** below before adding any animation.
- Icons: the design-system set is **Fluent (Microsoft Fluent UI System Icons, filled)**, via
  `<Icon name=… />`. Names stay kebab-case (Feather/registry vocabulary) and translate to glyph
  PATHS in ONE place — the generated `FLUENT` map in `components/fluentPaths.ts` — rendered as an
  SVG (`react-native-svg`, viewBox `0 0 24 24`). Swapping the icon family is a single-file change
  (the whole set lives on Iconify); screens never import an icon library. A name with no mapping
  falls back to the Feather font (and warns in `__DEV__`). To add an icon: map the canonical name
  → a Fluent glyph (`<base>-24-filled`, from `@iconify-json/fluent`) in the generator and
  regenerate the path map (+ add the name to `ExtraIconName` if it isn't a Feather glyph), then a
  registry key. Fluent has NO brand logos, so `facebook`/`instagram`/`whatsapp` render via
  FontAwesome5 (a scoped brand exception inside `Icon.tsx`).
  Legacy (un-migrated) screens may still use FontAwesome5/MaterialCommunity until their wave —
  don't do a risky global swap. ONE further exception: a server-driven glyph whose value is a
  vendor icon name (e.g. Community `bondStageIcon` = MCI) renders via that vendor until the
  backend emits registry names.
- **One icon per concept — use the `icons` registry** (`app/design-system/icons.ts`).
  It maps semantic keys (`icons.win`, `icons.courage`, …) to a single Feather glyph.
  Reference the key, don't inline a raw glyph name in a screen. Add a key to the
  registry BEFORE using a new icon, so a concept always renders the same icon and
  no glyph is overloaded for two meanings. Prefer **icons over emoji** for content
  (e.g. `ConnectedAvatarRow` takes an `icon` prop; moment data carries `icon`).

## Motion — one vocabulary (`design-system/motion.ts` + `useMotion.ts`)

All motion uses `react-native-reanimated` (migrate legacy RN `Animated` holdouts on
touch). NEVER hardcode a spring/curve/duration in a screen — reference the tokens:

- **Tokens** (`design-system/motion.ts`): `duration` (`fast 120` · `base 200` ·
  `reveal 240` · `sheetIn 300` / `sheetOut 200` — exit faster than enter · `count 700` ·
  `shimmer 1000`); `easing` (`out` for enters/feedback/reveals · `inOut` for one-shot
  on-screen movement · `in` for EXITS only — never enters · `loop` gentle symmetric
  breathing for ambient/loading **loops** (shimmer, pulse, float) · `linear`); `spring`
  (`press` snappy no-overshoot · `gentle` soft settle for sheets/layout · `bouncy` warm
  overshoot — **celebration only**, never on an error/neutral surface); `stagger {step 45,
  max 6}`. NEVER hardcode a number — the only raw values are bespoke ambient loop periods
  kept as named consts (`PULSE_PERIOD`, `FLOAT_PERIOD`).
- **Reduced-motion gate is mandatory.** Use `useMotion()` / the helpers in `useMotion.ts`
  so everything degrades the same way: reduced = keep opacity, drop transform/position
  (gentler, not zero); ambient loops (e.g. avatar float) go fully quiet. Any `withRepeat`
  or transform-bearing entrance MUST branch on `useReducedMotion`.
- **Helpers:** `staggerEntering(i, reduced)` (fade-up, capped delay) for section/list
  reveals; `fadeStaggerEntering(i, reduced)` (opacity-only — use where geometry must NOT
  shift, e.g. the Timeline rail "draws in"); `enterPreset` / `layoutPreset`.
- **Primitives — reuse, don't re-roll:** `PressableScale` (canonical press),
  `AnimatedNumber` (count-up), `PulseDot` (live dot), `Skeleton` (shimmer), `AnimatedModal`
  (the ONE centered-modal motion — scale 0.96→1 + scrim fade; `Dialog` routes through it),
  `SuccessCheck` / `useSuccessPop` (delight pop — an inline `Animated.View`, NEVER a second
  native Modal over a Sheet; see the stacked-native-modal memory).

**Event taxonomy** (one motion per event — reference it, never re-invent):

| Event | Motion | Tokens | Reduced |
|---|---|---|---|
| Press (any pressable) | scale 0.97 | `spring.press` | no scale |
| Section/list reveal (once) | fade + 8px up, staggered | `staggerEntering` | fade only |
| Connected-rail reveal | opacity-only stagger | `fadeStaggerEntering` | fade only |
| Sheet / drawer | slide-up + backdrop fade | `Sheet` (`sheetIn/out` + `gentle`) | backdrop only |
| Centered modal | scale 0.96→1 + fade | `AnimatedModal` (`gentle`) | fade only |
| Dock / tab morph | shared spring resize | `spring.gentle` | instant |
| Toggle | thumb slide + track color | `base` + `easing.out` | instant |
| Value change (XP/days) | count-up | `AnimatedNumber` (`count`) | instant final |
| Loading | shimmer | `Skeleton` (`shimmer` + `easing.loop`) | static |
| Success (save/share/reach-out) | check/disc pop | `useSuccessPop` (`bouncy`; `{celebrate:false}`→`gentle` for non-celebratory) | fade only |
| Live/fresh indicator | pulse ring loop | `PulseDot` (`easing.loop`) | hidden (solid dot) |
| List item remove | layout collapse + fade-out | `layoutPreset` + `FadeOut` | fade only |
| Ambient (avatar float) | slow translateY loop | `easing.loop` | **disabled** |

**Engine-boundary exception:** `Sheet` runs on the RN `Animated` engine, so it can't use
the Reanimated `easing.*` worklets — its durations are tokenized but its curves use RN's
native out/in-cubic (the analog of `easing.out`/`easing.in`). Don't "fix" it by sprinkling
`easing.*` in — it would throw. Everything else is Reanimated.

## Migrations are behavior-frozen

When migrating a legacy screen, the diff is **styling + JSX structure only**:

- Do NOT change logic, navigation, data flow, API calls, store reads/writes,
  effects, handlers, timers, or audio/speech setup. Copy handlers verbatim.
- If a change would alter behavior, STOP and flag it instead.
- Prefer porting an existing, liked component's geometry **verbatim** over
  reinventing it (the `ConnectedAvatarRow` seam was only fixed by porting the
  original `BridgeSVG` exactly — don't re-derive).
- Keep the public props of refactored components stable.

## Protected zones — do not touch

- **`app/assets/sw-faces/**`** and all 16 usage sites: never edit, recolor,
  remove, or alter the animations of the animated SVG faces. They stay rendered
  where they are. See the project's sw-faces memory.
- **`app/components/CustomTabBar.tsx`** is a keeper: re-theme colors only via
  `nav.*` tokens. Never change its form, expanding-pill animation, or behavior.
- Audio session: `App.tsx` defaults to `allowsRecordingIOS: false` (playback
  only); recorders arm record mode themselves and reset on stop. Don't globally
  re-enable recording. (A `-66680 / "no device with given ID"` log spam on the
  iOS Simulator is a host CoreAudio issue, not app code — it plays on a device.)

## Verify before done

- Typecheck with `tsc -p tsconfig.check.json` (NOT plain `tsc` — that compiles
  ios/Pods JS and masks app errors). Pre-existing `TS6133`/`TS6196` noise exists;
  only your files must be clean.
- Grep guard: no new `#hex`/`rgba(` in components/screens, no `colors.library`,
  no `parseTextStyle`/`parseShadowStyle`, no magic radius/spacing.
- `fallow` for dead code/dupes per wave, but protect React imports and never run
  `fallow fix` blindly (it can delete string-referenced config plugins).
- For visual/behavior changes, verify on the iOS simulator (the design-system
  preview lives behind `SHOW_DS_PREVIEW` in `App.tsx`; real screens render with
  the flag off).
