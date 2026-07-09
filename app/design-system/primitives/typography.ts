import { TextStyle } from "react-native";
import { fonts } from "./fonts";

/**
 * Typed text styles (replaces the legacy CSS-string `mobileTypography`).
 * Consume via the `Text` primitive's `variant` prop, or spread directly.
 */
export const typography = {
  screenTitle: { fontFamily: fonts.extrabold, fontWeight: "800", fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  display: { fontFamily: fonts.bold, fontWeight: "700", fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.bold, fontWeight: "700", fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontWeight: "700", fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontWeight: "400", fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.regular, fontWeight: "400", fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 13, lineHeight: 16, letterSpacing: 0.3 },
  caption: { fontFamily: fonts.medium, fontWeight: "500", fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
