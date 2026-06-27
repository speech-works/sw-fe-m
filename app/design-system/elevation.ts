import { ViewStyle } from "react-native";

/**
 * Elevation on dark = surface step (applied via surface.* role) + hairline
 * border (border.hairline role) + an optional shadow for true overlays only.
 * These objects add ONLY the shadow; the component supplies the surface bg +
 * hairline. iOS shadow* is paired with Android `elevation`.
 */
export const elevation = {
  e0: {} as ViewStyle,
  e1: {} as ViewStyle, // surface.card + border.hairline (no shadow on dark)
  e2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  e3: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 12,
  } as ViewStyle,
} as const;

export type ElevationLevel = keyof typeof elevation;
