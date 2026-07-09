import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, schemeGradients, GradientName, GradientToken } from "../primitives/gradients";
import { useThemeContext } from "../ThemeProvider";

export interface GradientProps {
  /** A named gradient recipe from the token set (e.g. "brand", "sunrise"). */
  token?: GradientName;
  /** Explicit colors — overrides `token` for one-offs. */
  colors?: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly [number, number, ...number[]];
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewStyle["pointerEvents"];
  children?: React.ReactNode;
}

/**
 * The single way to render a gradient. Pass a `token` for an on-brand recipe, or
 * `colors` for a one-off. Fills its box — set radius/padding/size via `style`.
 * Canvas-relative tokens (fade/scrims/sheen) resolve per scheme automatically.
 */
export const Gradient: React.FC<GradientProps> = ({
  token = "brand",
  colors,
  start,
  end,
  locations,
  style,
  pointerEvents,
  children,
}) => {
  const { scheme } = useThemeContext();
  const g: GradientToken = schemeGradients[scheme]?.[token] ?? gradients[token];
  return (
    <LinearGradient
      colors={colors ?? g.colors}
      start={start ?? g.start}
      end={end ?? g.end}
      locations={locations ?? g.locations}
      style={style}
      pointerEvents={pointerEvents}
    >
      {children}
    </LinearGradient>
  );
};
