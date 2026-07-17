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
  /** What the button DOES ("Mute breathing sounds"), not what it depicts. An
   *  icon-only button has no text to announce, so without this a screen reader
   *  reads nothing at all. */
  accessibilityLabel?: string;
}

/** Round, ≥44 tap-target icon button (e.g. header back). */
export const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  variant = "control",
  size = sizes.backBtn,
  color,
  accessibilityLabel,
}) => {
  const { colors, scheme, elevation } = useTheme();
  const isControl = variant === "control";
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
        },
        isControl
          ? {
              backgroundColor: scheme === "dark" ? colors.surface.control : colors.surface.inverse,
              ...(scheme === "dark"
                ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border.strong }
                : elevation.e2),
            }
          : { backgroundColor: "transparent" },
      ]}
    >
      <Icon name={name} size={20} color={color ?? colors.text.primary} />
    </PressableScale>
  );
};
