import React from "react";
import { View, ViewProps, ViewStyle } from "react-native";
import { useTheme } from "../useTheme";
import { radius, space } from "../primitives/scale";
import { ElevationLevel } from "../elevation";

type SurfaceLevel = "canvas" | "raised" | "default" | "elevated" | "control";

export interface SurfaceProps extends ViewProps {
  level?: SurfaceLevel;
  elevate?: ElevationLevel;
  rounded?: keyof typeof radius | number;
  bordered?: boolean;
  padded?: boolean | number;
}

/** Generic themed container — surface bg + role-based radius + optional hairline + elevation shadow. */
export const Surface: React.FC<SurfaceProps> = ({
  level = "default",
  elevate = "e0",
  rounded = "card",
  bordered,
  padded,
  style,
  children,
  ...rest
}) => {
  const { colors, elevation } = useTheme(); // themed: shadow weight is per-scheme
  const bgMap: Record<SurfaceLevel, string> = {
    canvas: colors.background.canvas,
    raised: colors.background.raised,
    default: colors.surface.default,
    elevated: colors.surface.elevated,
    control: colors.surface.control,
  };
  const radiusVal = typeof rounded === "number" ? rounded : radius[rounded];
  const pad = padded === true ? space.cardPad : typeof padded === "number" ? padded : 0;
  const s: ViewStyle = {
    backgroundColor: bgMap[level],
    borderRadius: radiusVal,
    padding: pad,
    ...(bordered ? { borderWidth: 1, borderColor: colors.border.hairline } : null),
    ...elevation[elevate],
  };
  return (
    <View {...rest} style={[s, style]}>
      {children}
    </View>
  );
};

/** Standard content card: elevated-by-a-step surface + hairline + padding. */
export const Card: React.FC<SurfaceProps> = (props) => (
  <Surface level="default" elevate="e1" rounded="card" bordered padded {...props} />
);
