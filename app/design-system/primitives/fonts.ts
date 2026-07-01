/**
 * Inter family names per weight. RN needs the concrete family (Android ignores
 * numeric fontWeight), so every typography token pairs a fontFamily with its weight.
 * All five must be loaded in FontLoader.tsx.
 */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;
