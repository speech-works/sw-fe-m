import React from "react";
import { ActivityIndicator, StyleProp, ViewStyle } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, hitTarget } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };
const PADX: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 24 };

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  /** Stretch to container width (default) or hug content. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary action primitive. Dark-on-bright per the AA rule; pill radius; press
 * feedback via PressableScale (reduced-motion aware). One primary CTA per screen.
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
}) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  let bg = colors.action.primary;
  let fg = colors.action.onPrimary;
  let borderColor: string | undefined;

  if (variant === "secondary") {
    bg = colors.action.secondary;
    fg = colors.action.onSecondary;
  } else if (variant === "ghost") {
    bg = "transparent";
    fg = colors.action.primary;
  } else if (variant === "danger") {
    bg = "transparent";
    fg = colors.feedback.dangerText;
    borderColor = colors.accent.danger;
  }

  if (isDisabled) {
    bg = bg === "transparent" ? "transparent" : colors.action.disabledBg;
    fg = colors.action.disabledText;
    borderColor = borderColor ? colors.action.disabledText : undefined;
  }

  const containerStyle: ViewStyle = {
    height: HEIGHT[size],
    minHeight: hitTarget.min,
    paddingHorizontal: PADX[size],
    borderRadius: radius.pill,
    backgroundColor: bg,
    borderWidth: borderColor ? 1 : 0,
    borderColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={[containerStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {leftIcon ? <Icon name={leftIcon} size={20} color={fg} /> : null}
          <Text variant="title" color={fg}>
            {label}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size={20} color={fg} /> : null}
        </>
      )}
    </PressableScale>
  );
};
