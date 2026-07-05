import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { typography, TypographyVariant } from "../primitives/typography";
import { useTheme } from "../useTheme";
import { SemanticColors } from "../semantic/roles";

type TextColor = keyof SemanticColors["text"] | (string & {});

export interface TextProps extends RNTextProps {
  /** Type-scale variant. Default `body`. */
  variant?: TypographyVariant;
  /** A `text.*` role key (e.g. "secondary") or a raw color string. Default `primary`. */
  color?: TextColor;
  center?: boolean;
}

/**
 * Dev-only guard: bright accent FILL hues read fine on the dark canvas but
 * collapse below AA as TEXT on a light surface. Colored text must use the
 * per-scheme `feedback.*Text` / `text.link` cuts, or `accentOn.*` when it sits
 * on a bright fill. `text.link` (#FFB580 on dark) is intentionally NOT in the
 * set — pass `color="link"` for links.
 */
const BRIGHT_FILL_HEXES = new Set([
  "#C8F750", "#8B7BF0", "#5BD98A", "#FFC53D", "#FF5A5F", "#5B9DF9", // accent bases
  "#FF9040", "#FF6B00", // action.primary / pressed / gamification.streak
]);

/**
 * Typed text primitive. `variant` maps to the type scale; `color` resolves a
 * `text.*` role (falling back to a raw color string for the rare on-fill case).
 */
export const Text: React.FC<TextProps> = ({
  variant = "body",
  color = "primary",
  center,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const resolved =
    (colors.text as Record<string, string>)[color as string] ?? (color as string);
  if (
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    typeof color === "string" &&
    BRIGHT_FILL_HEXES.has(color.toUpperCase())
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Text] color "${color}" is a bright FILL hue used as text — it fails AA on a ` +
        `light surface. Use feedback.*Text / text.link for colored text, or accentOn.* on a fill.`,
    );
  }
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: resolved },
        center ? { textAlign: "center" } : null,
        style,
      ]}
    />
  );
};
