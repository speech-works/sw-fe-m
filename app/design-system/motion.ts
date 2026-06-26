/**
 * Motion tokens. Implement with react-native-reanimated; always gate
 * non-essential motion behind a reduced-motion check (sw-faces are excluded).
 */
export const duration = {
  fast: 120,
  base: 200,
  slow: 300,
  sheetIn: 320,
  sheetOut: 220, // exits ~70% of enter
} as const;

export const easing = {
  standard: "out-cubic",
  spring: { damping: 18, stiffness: 180 },
} as const;

export const press = { scale: 0.97, duration: 120 } as const;
