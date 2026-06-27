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
