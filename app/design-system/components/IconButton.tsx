import React from "react";
import { StyleSheet } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { size as sizes } from "../primitives/scale";
import { Icon, IconName } from "./Icon";

export interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  variant?: "control" | "ghost";
  size?: number; // diameter (default 44)
  color?: string;
}

/** Round, ≥44 tap-target icon button (e.g. header back). */
export const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  variant = "control",
  size = sizes.backBtn,
  color,
}) => {
  const { colors } = useTheme();
  const isControl = variant === "control";
  return (
    <PressableScale
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isControl ? colors.surface.control : "transparent",
        // A defined hairline edge so the control reads as a distinct, tappable
        // object — load-bearing on the light canvas (where the fill is near the
        // surface), crisp-but-subtle on dark. Ghost stays edgeless.
        ...(isControl
          ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border.strong }
          : null),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} size={20} color={color ?? colors.text.primary} />
    </PressableScale>
  );
};
