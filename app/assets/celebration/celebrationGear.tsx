import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

/**
 * Bespoke party gear for the onboarding celebration — a party hat + heart
 * fun-glasses. Deliberately NOT avatar wardrobe parts: those are level-gated
 * (cowboy hat, flag, aviators are stage unlocks), and a brand-new user hasn't
 * earned them. This is one-off celebration dressing, layered OVER the avatar.
 *
 * Drawn in the avatar's own coordinate space (viewBox "-8 -8 64 64", the
 * 8-unit prop bleed) so it aligns pixel-for-pixel when rendered at the same
 * size over <UserAvatar>. Anchored to the brand face rig: eyes at (16,22) /
 * (32,22), crown near y=8, hat edges clear y≈18.8.
 */

const INK = "#241F26";
const ROSE = "#FF6B9D";
const GRAPE = "#8B6CFF";
const SUN = "#FFD23F";

/** A point-down heart, centred on the origin (~13 wide). */
const HEART =
  "M0 7 C-5.5 3 -6.5 -1 -6.5 -3.5 C-6.5 -6.2 -3.5 -7 -1.7 -4.8 C-0.9 -3.8 -0.3 -3 0 -2.3 C0.3 -3 0.9 -3.8 1.7 -4.8 C3.5 -7 6.5 -6.2 6.5 -3.5 C6.5 -1 5.5 3 0 7 Z";

export const CelebrationGear: React.FC<{ size: number }> = ({ size }) => (
  <Svg
    width={size}
    height={size}
    viewBox="-8 -8 64 64"
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  >
    {/* ── Heart fun-glasses (over the eyes) ─────────────────────────── */}
    {/* arms to the temples */}
    <Path d="M9.5 22 L5 20.4" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    <Path d="M38.5 22 L43 20.4" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    {/* bridge */}
    <Path
      d="M22 20.5 Q24 22.4 26 20.5"
      stroke={INK}
      strokeWidth={1.8}
      fill="none"
      strokeLinecap="round"
    />
    {[16, 32].map((cx) => (
      <G key={cx} transform={`translate(${cx} 22)`}>
        <Path d={HEART} fill={ROSE} fillOpacity={0.92} />
        <Path d={HEART} fill="none" stroke={INK} strokeWidth={1} />
        <Ellipse cx={-2.2} cy={-2.6} rx={1.7} ry={1.1} fill="#FFFFFF" opacity={0.8} />
      </G>
    ))}

    {/* ── Party hat (on the crown, jauntily tilted) ─────────────────── */}
    <G>
      <Path d="M15 11 L26 -8 L34.5 9.5 Z" fill={GRAPE} />
      <Path d="M15 11 L26 -8 L34.5 9.5 Z" fill="none" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
      {/* zig stripes */}
      <Path d="M19.6 7 L24 -3.4" stroke={SUN} strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M24 9.8 L28.6 -1" stroke={SUN} strokeWidth={2.3} strokeLinecap="round" />
      {/* brim band */}
      <Path d="M15 11 Q25 14 34.5 9.5" stroke={SUN} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      {/* pom-pom */}
      <Circle cx={26} cy={-8} r={3} fill="#FFFFFF" />
      <Circle cx={26} cy={-8} r={3} fill="none" stroke={INK} strokeWidth={0.9} />
    </G>
  </Svg>
);

export default CelebrationGear;
