import { TextStyle } from "react-native";
import { fonts } from "./fonts";

/**
 * Typed text styles (replaces the legacy CSS-string `mobileTypography`).
 * Consume via the `Text` primitive's `variant` prop, or spread directly.
 *
 * NEVER pair a family with `fontWeight` >= 700. The family already carries the
 * weight, and on Android the number actively breaks it: RN turns any weight
 * >= 700 into `Typeface.BOLD` and looks the family up under that style, but
 * expo-font registers everything it loads under `Typeface.NORMAL`. The lookup
 * misses the cache, then misses the asset path (there is no
 * `fonts/Inter_700Bold_bold.ttf`), and lands on `Typeface.create(<unknown
 * family>, BOLD)` — i.e. Roboto with a synthetic slant of bold. Silently, and
 * only on Android, which is why it survived so long. Leaving the weight off
 * keeps the style NORMAL and finds the real Inter face.
 *
 * Do not "fix" this by writing `fontWeight: "400"` instead: it would be a lie
 * about the weight, and it only happens to work because of how expo-font
 * aliases families on iOS. Omit the key.
 *
 * The one cost: if Inter fails to load entirely, iOS falls back to the
 * *regular* system font for these instead of the bold one. That path already
 * loses Inter everywhere (see FontLoader.tsx), so it is a rounding error.
 */
export const typography = {
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  /**
   * Poster headline for a full-bleed illustrated stage (Discover, Community).
   * A line height BELOW the font size is what makes three short lines read as
   * one block — `display`'s 40-on-32 opens them back out into separate lines,
   * which is why both stages hand-rolled their own cut rather than use it. They
   * landed 4px and 0.2 of tracking apart; this is Community's, the better one.
   */
  /**
   * lineHeight is 40, not 34. At lineHeight === fontSize Android clips every
   * descender — the "y" in "next to you." on the Buddy stage was cut in half on
   * a real device (iOS lets the glyph overhang, so it only shows on Android).
   * 40 is the smallest leading that clears Inter Bold's descender at 34pt.
   */
  poster: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -1.1 },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontWeight: "400", fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.regular, fontWeight: "400", fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 13, lineHeight: 16, letterSpacing: 0.3 },
  /**
   * The ALL-CAPS eyebrow / section label. Owns BOTH the case and the tracking so
   * a screen never adds its own — which is exactly how the app ended up drawing
   * one visual element 25 times at ten different trackings (0.2 through 4.0).
   * Caps need more air than body: 0.8 is where the existing sites cluster once
   * the outliers are dropped, and it is what `SignalCard` had already settled on.
   *
   * Deliberately NOT folded into `label`. `label` also carries form-field labels,
   * slider VALUES and a few button captions, so uppercasing it would silently
   * rewrite user-facing copy ("1.5x" → "1.5X", "Find Next" → "FIND NEXT").
   */
  eyebrow: {
    fontFamily: fonts.semibold,
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  caption: { fontFamily: fonts.medium, fontWeight: "500", fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
