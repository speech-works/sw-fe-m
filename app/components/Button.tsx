import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { parseTextStyle } from "../util/functions/parseFont";
import { theme } from "../Theme/tokens";

type ButtonSize = "large" | "medium" | "small" | "xSmall"; // Add 'xSmall'
type ButtonVariant = "ghost" | "normal";

interface ButtonProps {
  size?: ButtonSize;
  variant?: ButtonVariant;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  size = "medium",
  variant = "normal",
  onPress,
  children,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={
        disabled
          ? [styles.button, sizeStyles[size], styles.disabled]
          : [styles.button, sizeStyles[size], variantStyles[variant]]
      }
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={[textSize[size], textStyle[variant]]}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  disabled: {
    backgroundColor: theme.colors.neutral[7],
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  large: { paddingVertical: 14 },
  medium: { paddingVertical: 8 },
  small: { paddingVertical: 4 },
  xSmall: { paddingVertical: 2 }, // Add 'xSmall' padding
};

const textSize: Record<ButtonSize, TextStyle> = {
  large: { ...parseTextStyle(theme.typography.actionButton.large) },
  medium: { ...parseTextStyle(theme.typography.actionButton.medium) },
  small: { ...parseTextStyle(theme.typography.actionButton.small) },
  xSmall: { ...parseTextStyle(theme.typography.actionButton.small) }, // Use 'small' or create a new style for 'xSmall'
};

const textStyle: Record<ButtonVariant, TextStyle> = {
  normal: { color: theme.colors.neutral.white },
  ghost: { color: theme.colors.actionPrimary.default },
};

const variantStyles: Record<ButtonVariant, ViewStyle | TextStyle> = {
  normal: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: theme.colors.actionPrimary.default,
    borderWidth: 1,
  },
};

export default Button;
