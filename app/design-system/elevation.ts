import { Platform, ViewStyle } from "react-native";
import { palette as p } from "./primitives/palette";

/**
 * Elevation = surface step (applied via surface.* role) + hairline border
 * (border.hairline role) + an optional shadow for true overlays only. These
 * objects add ONLY the shadow; the component supplies the surface bg +
 * hairline. iOS shadow* is paired with Android `elevation`.
 *
 * Shadows are per-scheme: dark needs heavy opacity to read against near-black;
 * light needs soft, low-alpha shadows or every card looks smudged. Components
 * should consume `useTheme().elevation` (scheme-aware). The plain `elevation`
 * export below aliases the DARK set for legacy static imports — new code must
 * not add static imports.
 */
export const elevationDark = {
  e0: {} as ViewStyle,
  e1: {} as ViewStyle, // surface.card + border.hairline (no shadow on dark)
  e2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  e3: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 12,
  } as ViewStyle,
} as const;

/**
 * Light shadows are a warm brown (`palette.shadowWarm`), not cold #000 — a shadow must share
 * the warm paper's temperature, or cards read flat/cheap.
 *
 * TWO LAYERS, NOT ONE. A real object casts a tight CONTACT shadow ("this is
 * touching the page") and a broad AMBIENT one ("this is above it"). A single
 * mid-radius blur has neither shape and reads as a smudge — which mattered here
 * because on paper the shadow is not a garnish: the fill step is ΔE 4.1 and the
 * hairline ΔE 9.4, so the shadow is the third of three separators and the only
 * one that says "above" rather than "next to".
 *
 * iOS takes the two layers via `boxShadow` (RN 0.76+, and this app is on the
 * New Architecture). Android keeps `elevation` + `shadowColor`: it is a single
 * layer and it is the platform's own shadow, which is the right trade against
 * betting the whole scheme's depth on boxShadow parity across OEM ROMs.
 */
export const elevationLight = {
  e0: {} as ViewStyle,
  /**
   * A RESTING CARD ON PAPER NEEDS A SHADOW. On the ink scheme it does not — the
   * card fill (#24211B) sits a clear step above the canvas (#141311) and the
   * edge reads on its own, which is why `elevationDark.e1` is empty and should
   * stay empty. Paper is the opposite problem: `surface.default` (#FFFDF8) and
   * `surface.elevated` (#FFFEFB) are both near-white on a cream canvas
   * (#F7F2EA), roughly 1.02:1, so a neutral card has almost nothing but its
   * hairline to separate it from the page and reads as a flat patch.
   *
   * Deliberately much softer than `e2`. This is "a card is sitting here", not
   * "this floats above the page" — at e2's weight every list row on paper would
   * look like a dialog.
   */
  e1: Platform.select({
    ios: { boxShadow: `0px 1px 2px ${p.inkA(0.06)}, 0px 4px 12px ${p.inkA(0.06)}` },
    default: {
      shadowColor: p.shadowWarm,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 1,
    },
  }) as ViewStyle,
  e2: Platform.select({
    ios: { boxShadow: `0px 1px 2px ${p.inkA(0.07)}, 0px 8px 20px ${p.inkA(0.09)}` },
    default: {
      shadowColor: p.shadowWarm,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  }) as ViewStyle,
  e3: Platform.select({
    ios: { boxShadow: `0px 2px 4px ${p.inkA(0.08)}, 0px 20px 40px ${p.inkA(0.15)}` },
    default: {
      shadowColor: p.shadowWarm,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 12,
    },
  }) as ViewStyle,
} as const;

/** @deprecated static alias of the dark set — consume `useTheme().elevation` instead. */
export const elevation = elevationDark;

export type ElevationLevel = keyof typeof elevationDark;
