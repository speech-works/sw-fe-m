import React from "react";
import { View } from "react-native";
import { useTheme } from "../useTheme";

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Fill color (default lime — the XP/progress accent). */
  color?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 1, color, height = 10 }) => {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <View style={{ height, borderRadius: 9999, backgroundColor: colors.surface.row, overflow: "hidden" }}>
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
