import React from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../useTheme";
import { FLUENT } from "./fluentPaths";

/**
 * The design-system icon set is **Fluent (Microsoft Fluent UI System Icons, filled)**.
 * We keep the kebab-case `name` API (Feather/registry vocabulary) and translate it to a
 * glyph PATH in ONE place — the generated `FLUENT` map — rendered as an SVG via
 * `react-native-svg`. Screens never import an icon library; they use the `icons` registry.
 * Fluent has no brand logos, so the three social marks render via FontAwesome5 (a scoped
 * brand exception). Any unmapped name falls back to the Feather font (and warns in dev).
 */
type FeatherName = React.ComponentProps<typeof Feather>["name"];

/** Canonical names we use that aren't Feather glyphs (they render via the `FLUENT`
 *  map / brand exception). */
export type ExtraIconName =
  | "crown" | "infinity" | "bot" | "rocket" | "calendar-heart" | "heart-handshake"
  | "flame" | "chart-column" | "circle-alert" | "handshake" | "circle-check"
  | "ear" | "stethoscope" | "triangle-alert" | "sparkles" | "trophy"
  | "circle-arrow-up" | "message-circle-question-mark" | "lightbulb" | "sprout"
  | "route" | "chart-pie" | "square-check" | "party-popper" | "hand-helping"
  | "hourglass" | "medal" | "mic-vocal" | "layout-grid" | "history" | "whatsapp";

export type IconName = FeatherName | ExtraIconName;

export interface IconProps {
  name: IconName;
  size?: number; // use scale.size.icon (20) / iconSm (16) / tabIcon (24)
  color?: string;
  /** @deprecated Line-icon stroke width; ignored by the filled Fluent set (kept only so
   *  legacy call sites still type-check). */
  strokeWidth?: number;
  /** Layout-only style (margin/opacity/alignment). Not for color — use `color`. */
  style?: StyleProp<ViewStyle>;
}

// Fluent has no brand logos → these three render via FontAwesome5 brands.
const BRAND: Record<string, string> = { facebook: "facebook", instagram: "instagram", whatsapp: "whatsapp" };

export const Icon: React.FC<IconProps> = ({ name, size = 20, color, style }) => {
  const { colors } = useTheme();
  const resolved = color ?? colors.text.primary;

  const brand = BRAND[name];
  if (brand) {
    return <FontAwesome5 name={brand as any} size={size} color={resolved} brand style={style} />;
  }

  const paths = FLUENT[name];
  if (paths) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        {paths.map((p, i) => (
          <Path key={i} d={p.d} fill={resolved} fillRule={p.e ? "evenodd" : undefined} />
        ))}
      </Svg>
    );
  }

  // Fallback: a name with no Fluent mapping — render the Feather font glyph so it never
  // blanks, and flag it in dev so the mapping gets added.
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[Icon] "${name}" has no Fluent mapping — add it to fluentPaths.ts.`);
  }
  return <Feather name={name as FeatherName} size={size} color={resolved} style={style as StyleProp<TextStyle>} />;
};
