import { ViewStyle } from "react-native";

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

// Light shadows are a warm brown (#2A2018), not cold #000 — a shadow must share
// the warm paper's temperature, or cards read flat/cheap. Softer opacity than
// dark so cards don't smudge on the bright canvas.
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
  e1: {
    shadowColor: "#2A2018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 1,
  } as ViewStyle,
  e2: {
    shadowColor: "#2A2018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  e3: {
    shadowColor: "#2A2018",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,
} as const;

/** @deprecated static alias of the dark set — consume `useTheme().elevation` instead. */
export const elevation = elevationDark;

export type ElevationLevel = keyof typeof elevationDark;
