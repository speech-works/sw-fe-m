import React from "react";
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
  return (
    <PressableScale
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: variant === "control" ? colors.surface.control : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} size={20} color={color ?? colors.text.primary} />
    </PressableScale>
  );
};
