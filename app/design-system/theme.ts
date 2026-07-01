import { spacing, space, radius, size, hitTarget, zIndex } from "./primitives/scale";
import { typography } from "./primitives/typography";
import { fonts } from "./primitives/fonts";
import { elevation } from "./elevation";
import { duration, easing, press } from "./motion";
import { darkColors } from "./semantic/dark";
import { lightColors } from "./semantic/light";
import { SemanticColors } from "./semantic/roles";

export type Scheme = "dark" | "light";

/** Color schemes keyed by name (dark is primary; light is a Phase-F stub). */
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
  elevation,
  duration,
  easing,
  press,
} as const;

export type StaticTokens = typeof staticTokens;
