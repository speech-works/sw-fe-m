import React from "react";
import { SvgXml } from "react-native-svg";
import { useTheme } from "../../design-system";
import { PRACTICE_ICON_XML } from "./registry";

/** The accent roles practice cards are filled with. */
type CardAccent = "info" | "warning" | "danger" | "purple" | "success";

/**
 * The halo accent that CONTRASTS a card's own accent. The icon's circular
 * housing must never match the card it sits on, or it vanishes and the icon
 * reads as a bare silhouette floating on the fill. Mirrors the legacy faces,
 * which always sat on a contrasting plate (green on the blue Reading card,
 * purple on the yellow Fun card, …).
 */
const HALO_ACCENT: Record<CardAccent, CardAccent> = {
  info: "success", // blue card    → green halo
  warning: "purple", // yellow card  → purple halo
  danger: "purple", // red card     → lavender halo
  purple: "warning", // purple card  → amber halo
  success: "warning", // green card   → amber halo
};

export const haloAccentFor = (cardAccent: string): CardAccent =>
  HALO_ACCENT[cardAccent as CardAccent] ?? "success";

/**
 * Renders a practice category/item icon (the face-free object system) from the
 * generated registry via `SvgXml` — no svg-file loader needed. `name` is the
 * icon key (a .svg filename without extension), e.g. "reading", "fun",
 * "reading-poems". `housing` drives the circular halo (the SVGs paint it with
 * `currentColor`); pass a color that contrasts the card. Unknown keys render
 * nothing.
 */
export const PracticeIcon: React.FC<{
  name: string;
  size?: number;
  housing?: string;
}> = ({ name, size = 56, housing }) => {
  const { colors } = useTheme();
  const xml = PRACTICE_ICON_XML[name];
  if (!xml) return null;
  return (
    <SvgXml
      xml={xml}
      width={size}
      height={size}
      color={housing ?? colors.surface.inverse}
    />
  );
};
