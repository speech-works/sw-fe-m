import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../useTheme";

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Progress arc color (default brand). */
  color?: string;
  /** Track color (default surface row). */
  trackColor?: string;
  /** Centered content (e.g. a value Text or an Icon). */
  children?: React.ReactNode;
}

/** Circular progress — daily-goal / session-completion ring. */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 96,
  strokeWidth = 10,
  color,
  trackColor,
  children,
}) => {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor ?? colors.surface.row}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? colors.action.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          // start at 12 o'clock
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View> : null}
    </View>
  );
};
