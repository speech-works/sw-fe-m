import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, schemeGradients, GradientName, GradientToken } from "../primitives/gradients";
import { useThemeContext } from "../ThemeProvider";
import { splitShadowAndClip } from "../utils/shadowSplit";

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

  const paint = (s: StyleProp<ViewStyle>, kids: React.ReactNode) => (
    <LinearGradient
      colors={colors ?? g.colors}
      start={start ?? g.start}
      end={end ?? g.end}
      locations={locations ?? g.locations}
      style={s}
      pointerEvents={pointerEvents}
    >
      {kids}
    </LinearGradient>
  );

  /**
   * A GUARD, NOT A FEATURE. Returns null for every style that was already fine,
   * so this changes nothing for any existing caller — at the time it was added,
   * no call site in the app hit it.
   *
   * It fires only for a style asking one view to cast a shadow AND clip a
   * rounded corner, which on iOS silently renders as a square. That has been
   * shipped twice, both times invisible on the ink scheme, so it is worth
   * catching in the component rather than at each call site.
   */
  const split = splitShadowAndClip(style);
  if (!split) return paint(style, children);

  if (__DEV__) {
    // Say it out loud as well as fixing it: the author should learn the rule,
    // not rely on the component quietly rescuing them.
    // eslint-disable-next-line no-console
    console.warn(
      "[Gradient] A style set both a shadow and a borderRadius on this gradient. " +
        "On iOS that stops the corners clipping and the card renders square. " +
        "The shadow has been moved to a wrapper automatically; prefer splitting " +
        "it yourself so the styles say what they mean.",
    );
  }

  return (
    // Outer: casts the shadow, and is the box the parent lays out.
    <View style={split.outer} pointerEvents={pointerEvents}>
      {/* Inner: does the clipping, and owns everything about the inside of the
          box. The gradient must be INSIDE this one, not a sibling of it, or
          there is nothing clipping it and the square corners come straight
          back. Children paint over it because they come after it in flow. */}
      <View style={split.inner}>
        {paint(StyleSheet.absoluteFill, null)}
        {children}
      </View>
    </View>
  );
};
