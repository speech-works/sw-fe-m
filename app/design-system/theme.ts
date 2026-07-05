import { spacing, space, radius, size, hitTarget, zIndex } from "./primitives/scale";
import { typography } from "./primitives/typography";
import { fonts } from "./primitives/fonts";
import { elevationDark, elevationLight } from "./elevation";
import { duration, easing, press } from "./motion";
import { darkColors } from "./semantic/dark";
import { lightColors } from "./semantic/light";
import { SemanticColors } from "./semantic/roles";

export type Scheme = "dark" | "light";

/** Color schemes keyed by name. */
export const schemes: Record<Scheme, SemanticColors> = {
  dark: darkColors,
  light: lightColors,
};

/** Mode-invariant tokens — identical across schemes, so they never go through the hook. */
export const staticTokens = {
  spacing,
  space,
  radius,
  size,
  hitTarget,
  zIndex,
  typography,
  fonts,
  elevation: elevationDark,
  duration,
  easing,
  press,
} as const;

export type StaticTokens = typeof staticTokens;

/**
 * Per-scheme token sets handed out by useTheme/makeStyles. Everything is
 * shared except `elevation` (shadow weight is scheme-tuned). Kept as
 * StaticTokens-shaped so consumers are agnostic.
 */
export const tokensByScheme: Record<Scheme, StaticTokens> = {
  dark: staticTokens,
  light: { ...staticTokens, elevation: elevationLight },
};
