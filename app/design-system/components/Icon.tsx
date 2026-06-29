import React from "react";
import { Feather } from "@expo/vector-icons";
import * as LucideIcons from "lucide-react-native";
import { useTheme } from "../useTheme";

/**
 * The design-system icon set is **Lucide** (the SVG successor of Feather — same
 * line-icon look, but stroke-adjustable). We keep the kebab-case `name` API
 * (Feather/Lucide share names); any name Lucide lacks/renamed falls back to the
 * Feather icon font, so nothing can render blank. Use the `icons` registry for
 * semantic names; bump `strokeWidth` for bold/avatar icons.
 */
export type IconName = React.ComponentProps<typeof Feather>["name"];

export interface IconProps {
  name: IconName;
  size?: number; // use scale.size.icon (20) / iconSm (16) / tabIcon (24)
  color?: string;
  /** Line thickness — Lucide default is 2; bump (e.g. 2.75) for bold/avatar icons. */
  strokeWidth?: number;
}

// Feather/registry glyph names are kebab-case; Lucide components are PascalCase.
const toPascal = (name: string): string =>
  name
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join("");

type LucideComp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const LUCIDE = LucideIcons as unknown as Record<string, LucideComp | undefined>;

export const Icon: React.FC<IconProps> = ({ name, size = 20, color, strokeWidth }) => {
  const { colors } = useTheme();
  const resolved = color ?? colors.text.primary;
  const Glyph = LUCIDE[toPascal(name)];
  if (Glyph) {
    return <Glyph size={size} color={resolved} strokeWidth={strokeWidth ?? 2} />;
  }
  // Fallback: a Feather name Lucide renamed/lacks — render the font glyph (no stroke control).
  return <Feather name={name} size={size} color={resolved} />;
};
