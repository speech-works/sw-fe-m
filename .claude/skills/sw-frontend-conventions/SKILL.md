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
  honor `useReducedMotion` for non-essential motion.
- Icons: the design-system set is Feather (`<Icon name=…>`). Legacy screens may
  still use FontAwesome5/MaterialCommunity until their wave — don't do a risky
  global icon swap.

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
