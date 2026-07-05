import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../useTheme";

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Fill color (default lime — the XP/progress accent). */
  color?: string;
  height?: number;
}

/**
 * A track + fill meter. The track uses `surface.control` (a real tonal step in
 * both schemes) and carries a hairline border so the CONTROL is identifiable on
 * a light canvas — on paper an untinted white track over a white card vanishes
 * (WCAG 1.4.11). Bright pastel fills (XP lime, gold) then read as a distinct hue
 * region against the toned, outlined track.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 1, color, height = 10 }) => {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <View
      style={{
        height,
        borderRadius: 9999,
        backgroundColor: colors.surface.control,
        overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border.strong,
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${pct * 100}%`,
          borderRadius: 9999,
          backgroundColor: color ?? colors.gamification.xp,
        }}
      />
    </View>
  );
};
