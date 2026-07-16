# Speechworks practice icon system

Nineteen production SVG icons designed for 48–64px use on practice cards. Every icon uses `viewBox="0 0 48 48"` and the exact category housing colors from the brief.

## Categories

| Category | Housing | Wearable prop | Source |
| --- | --- | --- | --- |
| Reading | `#5B9DF9` | Round reading glasses | `categories/reading.svg` |
| Fun | `#F5C64E` | 3D movie glasses | `categories/fun.svg` |
| Cognitive | `#F06B6B` | Over-ear headphones | `categories/cognitive.svg` |
| Exposure | `#9B87F5` | Folded courage bandana, tied behind | `categories/exposure.svg` |

All four use the supplied squircle path verbatim in `#171420`. Props are aligned to the supplied eye anchors at `(16, 22)` and `(32, 22)`.

## Items

- Reading: Words, Phrases, Quotes, Poems, Stories
- Fun: Tongue Twisters, Roleplay, Character Voice
- Cognitive: Guided Breathing, Guided Meditation, Reframe Thoughts, Mirror Work
- Exposure: Social Challenges, Interview Simulation, AI Phone Calls

Item SVGs live in `items/` and contain no face silhouette. Open `preview.svg` to review the complete labeled system together.

## Construction notes

- Transparent beyond the circular housing.
- Flat fills for the object art; a finishing layer adds a halo light model
  (radial top-left glow + bottom vignette + hairline rim ring — neutral
  white/black overlays, so they work on any runtime `currentColor` halo),
  a crown rim-light on the four category silhouettes, and two sparkle
  accents per icon. No SVG filters (react-native-svg safe).
- Main objects use a bright fill plus one darker category-specific depth shade.
- Rounded structural strokes remain at least 1.8 units and are designed to survive 48px rendering.
- No animation is embedded, keeping the sources compatible with static SVG pipelines and React Native SVG conversion.
