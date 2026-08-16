import { Platform, ViewStyle } from "react-native";
import { palette as p } from "./primitives/palette";
import { withAlpha } from "./utils/color";

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
 * Android below API 28 has no box-shadow drawable at all: RN's
 * `OutsetBoxShadowDrawable` is gated on 28, and `setBoxShadow` silently drops
 * the layer below it. Those two versions fall back to bare `elevation`.
 *
 * Nothing regresses there. `shadowColor` is API 28+ too (it lands on
 * `setOutlineSpotShadowColor`), so on 26-27 the warm tint was never applied
 * either — the shadow was already the platform's default black.
 */
const androidLegacyShadow =
  Platform.OS === "android" && Number(Platform.Version) < 28;

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
 * BOTH PLATFORMS TAKE `boxShadow` (RN 0.76+, New Architecture, which this app
 * runs). Android used to keep `elevation` + `shadowColor` here, on the reasoning
 * that the platform's own shadow beat betting on boxShadow parity across OEM
 * ROMs. That reasoning was backwards, and it shipped a visible bug:
 *
 *   `shadowOffset`, `shadowOpacity` and `shadowRadius` are iOS-only props.
 *   Android reads `shadowColor` and nothing else, so `shadowOpacity: 0.1` was
 *   discarded and `p.shadowWarm` (#2A2018, FULLY OPAQUE) went straight to
 *   `setOutlineSpotShadowColor`. Every elevated surface on paper/Android drew
 *   its shadow at 100% of a near-black brown instead of the intended 7-16% —
 *   ~10x too heavy, which reads as a hard dark cut hugging the shape rather
 *   than a shadow. Most obvious on the small round controls (the header back
 *   button), where a tight opaque ring has nowhere to diffuse.
 *
 * `boxShadow` fixes it at the root because the alpha is IN the colour, so
 * there is no iOS-only prop left to drop. It is also the more portable of the
 * two: `OutsetBoxShadowDrawable` is RN drawing to a Canvas identically on every
 * device, whereas `elevation` is the part the OEM ROM controls. And it resolves
 * `borderRadius` (`drawShadowRoundRect`), so the shadow traces the circle.
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
  e1: (androidLegacyShadow
    ? { elevation: 1 }
    : {
        boxShadow: `0px 1px 2px ${p.inkA(0.06)}, 0px 4px 12px ${p.inkA(0.06)}`,
      }) as ViewStyle,
  e2: (androidLegacyShadow
    ? { elevation: 4 }
    : {
        boxShadow: `0px 1px 2px ${p.inkA(0.07)}, 0px 8px 20px ${p.inkA(0.09)}`,
      }) as ViewStyle,
  e3: (androidLegacyShadow
    ? { elevation: 12 }
    : {
        boxShadow: `0px 2px 4px ${p.inkA(0.08)}, 0px 20px 40px ${p.inkA(0.15)}`,
      }) as ViewStyle,
} as const;

/** @deprecated static alias of the dark set — consume `useTheme().elevation` instead. */
export const elevation = elevationDark;

export type ElevationLevel = keyof typeof elevationDark;

export interface CastShadowSpec {
  /** Vertical offset in dp. Horizontal is always 0 — nothing here is side-lit. */
  y?: number;
  /**
   * CSS blur radius in dp. NOT the same number as the legacy `shadowRadius`:
   * UIKit's radius is the Gaussian sigma, CSS's is roughly twice that, so a
   * `shadowRadius: 8` becomes `blur: 16`. Convert, don't copy.
   */
  blur: number;
  /** 0-1. Folded INTO the colour — that is the whole point of this helper. */
  alpha: number;
  /** Android < 28 only, where there is no shadow drawable to draw into. */
  elevation: number;
}

/**
 * A shadow whose COLOUR is only known at render time — a theme role
 * (`colors.shadow`) or an accent threaded in from a card — so it can't be one of
 * the static `elevation*` levels above.
 *
 * Reach for this anywhere you were about to hand-write `shadowColor` +
 * `shadowOpacity`. That pairing is the bug documented on `elevationLight`:
 * `shadowOpacity` is iOS-only, so Android takes the colour at FULL strength.
 * Here the alpha is folded into the colour, which both platforms honour.
 */
export const castShadow = (color: string, spec: CastShadowSpec): ViewStyle =>
  androidLegacyShadow
    ? { elevation: spec.elevation }
    : {
        boxShadow: `0px ${spec.y ?? 0}px ${spec.blur}px ${withAlpha(color, spec.alpha)}`,
      };

/**
 * Cancels a `castShadow` further up a composed style array (a disabled state
 * over an enabled base). `shadowOpacity: 0` no longer does this — it was always
 * an iOS-only prop, and there is no `shadowOpacity` left to zero.
 */
export const noShadow: ViewStyle = androidLegacyShadow
  ? { elevation: 0 }
  : { boxShadow: [] };
