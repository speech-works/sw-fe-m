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
/* Pairs verified numerically (WCAG relative luminance on the palette bases):
 * every card→halo pair must clear ≥1.4:1 so the plate survives for
 * red-green colorblind users. Current ratios: info→success 1.54,
 * warning→purple 2.15, danger→warning 1.93, purple→warning 2.15,
 * success→purple 1.90. (danger→purple and success→warning were ~1.1 — the
 * halo vanished; never reintroduce a pair without recomputing.) */
const HALO_ACCENT: Record<CardAccent, CardAccent> = {
  info: "success", // blue card    → green halo   (1.54)
  warning: "purple", // yellow card  → purple halo  (2.15)
  danger: "warning", // red card     → amber halo   (1.93)
  purple: "warning", // purple card  → amber halo   (2.15)
  success: "purple", // green card   → purple halo  (1.90)
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
