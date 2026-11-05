/**
 * Inter family names per weight. RN needs the concrete family (Android ignores
 * numeric fontWeight), so every typography token pairs a fontFamily with its weight.
 * All seven must be loaded in FontLoader.tsx.
 */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
  /** Italic for *emphasis* in program text. A family name, so it renders the
   *  real italic face instead of nothing (RN cannot slant a custom font). */
  italic: "Inter_400Regular_Italic",
  /** Italic inside a semibold run, such as a quote with no bold in it. */
  semiboldItalic: "Inter_600SemiBold_Italic",
} as const;
