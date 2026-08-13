import { StyleSheet, ViewStyle } from "react-native";
import { SemanticColors } from "../semantic/roles";

/**
 * The boundary a FILLED object needs on paper, as a style fragment.
 *
 * Every `*Edge` role resolves to `"transparent"` on the ink scheme, because a
 * bright fill there is already 5–15:1 above the canvas and draws its own shape.
 * On paper the same fill is 1.1–3.0:1 — the hue reads, the SHAPE does not — so
 * a full-bleed accent card, a category tile or a solid chip bleeds into the
 * page and the composition loses its architecture.
 *
 * These helpers return `{}` rather than a transparent 1px border on dark, so no
 * layout changes and nothing pays for a border it does not draw.
 *
 *   <View style={[styles.fill, { backgroundColor: fill }, accentEdge(colors, "info")]} />
 */
const edgeOf = (color: string, hairline?: boolean): ViewStyle =>
  color === "transparent"
    ? {}
    : { borderWidth: hairline ? StyleSheet.hairlineWidth : 1, borderColor: color };

/** Edge for a filled `accent.*` surface. */
export const accentEdge = (
  colors: SemanticColors,
  key: keyof SemanticColors["accentEdge"],
  hairline?: boolean,
): ViewStyle => edgeOf(colors.accentEdge[key], hairline);

/** Edge for a filled `category.*` tile. */
export const categoryEdge = (
  colors: SemanticColors,
  key: keyof SemanticColors["categoryEdge"],
  hairline?: boolean,
): ViewStyle => edgeOf(colors.categoryEdge[key], hairline);

/** Edge for a filled `action.primary` (orange) surface. */
export const primaryEdge = (colors: SemanticColors, hairline?: boolean): ViewStyle =>
  edgeOf(colors.action.primaryEdge, hairline);

/**
 * Edge for a BRIGHT DISC on the neutral ground — an icon housing, a glyph
 * avatar, a switch thumb. Not for a disc on a coloured fill: white on colour
 * already has a boundary, and this would just be chrome.
 */
export const discEdge = (colors: SemanticColors, hairline = true): ViewStyle =>
  edgeOf(colors.surface.discEdge, hairline);

/**
 * Edge for an arbitrary, computed fill (a threaded accent hex with no token
 * behind it). Returns `{}` on ink. On paper it borrows the neutral warm edge
 * rather than guessing a cut of a hue it does not know — a defined boundary is
 * the goal, not a colour match.
 */
export const computedFillEdge = (colors: SemanticColors, hairline?: boolean): ViewStyle =>
  colors.surface.discEdge === "transparent" ? {} : edgeOf(colors.border.strong, hairline);
