import React from "react";
import { TextStyle } from "react-native";
import PressableScale from "../../components/PressableScale";
import { space } from "../primitives/scale";
import { TypographyVariant } from "../primitives/typography";
import { Text, TextProps } from "./Text";

export interface TextLinkProps {
  label: string;
  onPress: () => void;
  /** A `text.*` role key or a raw colour. On a bright accent surface pass the
   *  on-fill ink (`accentOn.*`); defaults to the `text.link` role. */
  color?: TextProps["color"];
  /** Type-scale variant (default `bodySm`). */
  variant?: TypographyVariant;
  align?: TextStyle["textAlign"];
  /**
   * Drop the underline. Default true — leave it ON unless the link's POSITION
   * already makes it unmistakably an action (e.g. the lone centred line directly
   * beneath a carousel's paging dots). The underline exists to stop a link
   * reading as content copy; only turn it off where nothing could be misread as
   * copy in the first place, never merely because it looks cleaner.
   */
  underline?: boolean;
}

/**
 * A tertiary, underlined text action — the third affordance tier between bare
 * content (no underline, not tappable) and enclosed Buttons (solid island /
 * outline pill). The underline is what keeps it legible as a link rather than
 * mistaken for content copy, so it does NOT reintroduce the content-vs-action
 * ambiguity the no-ghost-button rule guards against. Use ONLY for low-priority /
 * navigational actions (step transitions, "more", "back") — never a primary CTA.
 */
export const TextLink: React.FC<TextLinkProps> = ({
  label,
  onPress,
  color = "link",
  variant = "bodySm",
  align = "center",
  underline = true,
}) => (
  <PressableScale
    haptic={false}
    scaleTo={0.97}
    onPress={onPress}
    accessibilityRole="link"
    style={{ alignSelf: "center", paddingVertical: space.inlineGap }}
  >
    <Text
      variant={variant}
      color={color}
      style={{ textAlign: align, textDecorationLine: underline ? "underline" : "none" }}
    >
      {label}
    </Text>
  </PressableScale>
);
