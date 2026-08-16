import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

/**
 * Splitting a style that asks one view to both cast a shadow and clip its
 * children.
 *
 * WHY THIS EXISTS. On iOS a view carrying RN's `boxShadow` plus
 * `overflow: "hidden"` stops clipping its own background, so a rounded gradient
 * paints straight through its corners and renders as a square. It has bitten
 * this codebase twice: the Community room's empty seat and the quiz result
 * hero. Both were only visible on the paper scheme, because the ink scheme's
 * `elevation` still resolves to the legacy `shadow*` props rather than
 * `boxShadow`, so the bug hides on the scheme most of the work happens in.
 *
 * The fix is always the same: the shadow goes on an outer view, the clip stays
 * on an inner one.
 */

/** Anything that makes a view cast a shadow, across both platforms and both
 *  the legacy and the `boxShadow` form. */
const SHADOW_KEYS = [
  "shadowColor",
  "shadowOffset",
  "shadowOpacity",
  "shadowRadius",
  "elevation",
  "boxShadow",
] as const;

/**
 * Props that describe where a box SITS rather than what it contains.
 *
 * These have to travel to the outer view, because once we wrap, the outer view
 * is the one the parent lays out. Everything not listed here (padding, gap,
 * alignItems, backgroundColor and so on) describes the inside of the box and
 * stays with the content.
 */
const GEOMETRY_KEYS = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "aspectRatio",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "start",
  "end",
  "zIndex",
] as const;

export interface SplitStyle {
  /** Casts the shadow and owns the layout box. */
  outer: ViewStyle;
  /** Clips the content. Keeps everything about the inside of the box. */
  inner: ViewStyle;
}

/**
 * Returns null when there is nothing to fix, which is the overwhelmingly common
 * case. Callers render exactly as before when it returns null, so a component
 * adopting this changes nothing for any style that was already fine.
 */
export function splitShadowAndClip(style: StyleProp<ViewStyle>): SplitStyle | null {
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  if (!flat) return null;

  const hasShadow = SHADOW_KEYS.some(
    (k) => (flat as Record<string, unknown>)[k] !== undefined,
  );
  // No radius means nothing to clip, so a shadow on its own is fine.
  if (!hasShadow || flat.borderRadius === undefined) return null;

  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    if ((SHADOW_KEYS as readonly string[]).includes(key)) outer[key] = value;
    else if ((GEOMETRY_KEYS as readonly string[]).includes(key)) outer[key] = value;
    else inner[key] = value;
  }

  // The radius belongs to BOTH: the outer needs it so the shadow traces the
  // rounded shape rather than a rectangle, the inner needs it to clip.
  outer.borderRadius = flat.borderRadius;
  inner.borderRadius = flat.borderRadius;
  // The whole point of the split.
  inner.overflow = "hidden";

  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}
