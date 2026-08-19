import type { SemanticColors } from "../../../../../design-system";
import { onColor, accentEdge, primaryEdge } from "../../../../../design-system";
import type { ViewStyle } from "react-native";

/**
 * ============================================================================
 * THE CARD'S ACCENT — a key from the console, resolved by the design system
 * ----------------------------------------------------------------------------
 * The server sends a KEY ('orange' | 'lime' | 'purple' | ...), never a colour.
 * That is the whole point: one key resolves to FOUR values the app needs, and
 * three of them cannot be derived from a hex at render time.
 *
 *   fill   the accent as a full-bleed surface
 *   ink    the AA-correct foreground ON that fill (`accentOn`)
 *   text   the accent used AS text on a normal surface — a DIFFERENT cut per
 *          scheme, lighter on ink and darker on paper, because the bright base
 *          collapses below AA as text on the light canvas
 *   tint   a low-alpha wash for an icon housing, NOT a fill — the per-hue alpha
 *          differs on paper, where a flat percentage would leave some hues
 *          visible and others barely there
 *   edge   the 1px boundary a filled object needs on paper, `{}` on ink
 *
 * ── WHY 'orange' IS NOT IN `colors.accent` ──────────────────────────────────
 * The brand primary lives under `action.*`, not in the six-accent family, so it
 * has no `accentOn` / `accentText` / `accentEdge` entry. It is resolved here
 * from its own roles instead of being bolted into the accent map, because
 * inventing a seventh accent token would mean touching the scheme contract for
 * a colour that already has correct roles of its own.
 * ============================================================================
 */

export interface ResolvedAccent {
  fill: string;
  ink: string;
  text: string;
  tint: string;
  edge: ViewStyle;
  /**
   * The same boundary as `edge`, as a bare colour.
   *
   * `edge` is a `ViewStyle` and an SVG `<Path>` cannot take one. The folder's
   * pages are drawn as paths, because a folded corner has to be a real hole in
   * the sheet rather than a triangle painted over it. `"transparent"` on ink,
   * exactly as `edge` resolves to `{}` there.
   */
  edgeColor: string;
}

type AccentKey = keyof SemanticColors["accent"];

const IS_ACCENT: Record<string, AccentKey> = {
  lime: "lime",
  purple: "purple",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

/**
 * Resolve a console-chosen accent key.
 *
 * An UNKNOWN key falls back to the brand primary rather than throwing or
 * rendering a colourless fill. New accents ship from the console, so an app
 * build older than the palette WILL see keys it does not know — and a card that
 * is the wrong shade of on-brand is a far better failure than one that is
 * invisible.
 */
export function resolveAccent(
  key: string | null | undefined,
  colors: SemanticColors,
): ResolvedAccent {
  const accent = key ? IS_ACCENT[key] : undefined;

  if (!accent) {
    return {
      fill: colors.action.primary,
      ink: onColor(colors.action.primary, colors),
      text: colors.text.accent,
      tint: colors.action.primaryTint,
      edge: primaryEdge(colors, true),
      edgeColor: colors.action.primaryEdge,
    };
  }

  return {
    fill: colors.accent[accent],
    ink: colors.accentOn[accent],
    text: colors.accentText[accent],
    tint: colors.accentTint[accent],
    edge: accentEdge(colors, accent, true),
    edgeColor: colors.accentEdge[accent],
  };
}
