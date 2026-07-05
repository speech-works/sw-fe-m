/**
 * Public entry point for the design system. Screens/components import ONLY from
 * here (e.g. `import { useTheme, makeStyles, radius } from "app/design-system"`).
 */
export { ThemeProvider, ForceDark, useThemeContext } from "./ThemeProvider";
export { useTheme, makeStyles } from "./useTheme";

// Primitive components.
export * from "./components";

// Static tokens (mode-invariant — safe in module-scope StyleSheet.create).
export { spacing, space, radius, size, hitTarget, zIndex, borderWidth, opacity } from "./primitives/scale";
export { typography } from "./primitives/typography";
export type { TypographyVariant } from "./primitives/typography";
export { fonts } from "./primitives/fonts";
export { icons } from "./icons";
export type { IconKey } from "./icons";
export { gradients } from "./primitives/gradients";
export type { GradientName, GradientToken } from "./primitives/gradients";
export { elevation } from "./elevation";
export type { ElevationLevel } from "./elevation";
export { duration, easing, spring, stagger, press } from "./motion";
export { useMotion, staggerEntering, fadeStaggerEntering, enterPreset, layoutPreset } from "./useMotion";
export { haptics } from "./haptics";

// Contrast/legibility helpers — pick & verify legible text on any fill (WCAG AA).
export {
  onColor,
  bestForeground,
  contrastRatio,
  relativeLuminance,
  meetsAA,
  assertContrast,
  darkenForContrast,
  AA_NORMAL,
  AA_LARGE,
} from "./utils/contrast";
export { withAlpha, mix } from "./utils/color";

// Types + scheme metadata.
export type { SemanticColors } from "./semantic/roles";
export type { Scheme, StaticTokens } from "./theme";
export { schemes } from "./theme";

// Raw palette — escape hatch for the rare case (e.g. building a new semantic
// role). Screens should NOT import this; use useTheme().colors.
export { palette } from "./primitives/palette";
