/**
 * Raw color primitives — the ONLY file allowed to hold color hex literals.
 * Warm "Vivid" dark-first palette (locked rev-4). Nothing outside `semantic/`
 * should import these for color; screens consume semantic roles via useTheme().
 */
export const palette = {
  // Neutral "ink" ramp (warm) — dominant surfaces + text greys.
  ink: {
    canvas: "#141311",
    panel: "#1C1A17",
    card: "#24211B", // e1
    row: "#2E2A24",
    control: "#393430",
    sunken: "#0E0D0B",
    textPrimary: "#FFFFFF",
    textSecondary: "#ADA7A0",
    textTertiary: "#8A857C",
    textDisabled: "#5C574F",
  },

  // Brand orange (kept).
  orange: {
    100: "#FFF0E5",
    200: "#FFDABF",
    300: "#FFB580",
    400: "#FF9040", // hero
    500: "#FF6B00", // pressed
    600: "#BF5000",
    700: "#803600",
    800: "#401B00",
    on: "#2A1505", // dark text on an orange fill (AA)
  },

  // Energy accents. base = fill · on = dark text on fill · textOnDark = hue used AS text on a dark surface.
  lime: { base: "#C8F750", on: "#20300A", textOnDark: "#C8F750" },
  purple: { base: "#8B7BF0", on: "#18123A", textOnDark: "#B5A8F5" },
  success: { base: "#5BD98A", on: "#08351F", textOnDark: "#7DE6A3" },
  warning: { base: "#FFC53D", on: "#3A2A00", textOnDark: "#FFD66B" },
  danger: { base: "#FF5A5F", on: "#3A0608", textOnDark: "#FF9296" },
  info: { base: "#5B9DF9", on: "#06203F", textOnDark: "#8FBEFF" },

  // Category hues (muted; legible as icon-tint on the card surface). on = dark text on a full fill.
  category: {
    reading: { base: "#5FB3AB", on: "#06302C" }, // teal
    breathing: { base: "#A2B57E", on: "#1E2A0E" }, // sage
    mirror: { base: "#B084AA", on: "#2E1B2A" }, // plum
    exposure: { base: "#C9805F", on: "#3A1B0E" }, // terracotta
    fun: { base: "#D6B86F", on: "#3A2C0A" }, // sand
    realLife: { base: "#CB8398", on: "#2E1119" }, // rose (hero full-fill)
  },

  // Input surfaces (slightly distinct from the ink ramp).
  inputBg: "#201E1A",
  inputBorder: "#423D37",

  white: "#FFFFFF",
  black: "#000000",
  whiteA: (a: number) => `rgba(255,255,255,${a})`,
  blackA: (a: number) => `rgba(0,0,0,${a})`,
  orangeA: (a: number) => `rgba(255,144,64,${a})`,
} as const;

export type Palette = typeof palette;
