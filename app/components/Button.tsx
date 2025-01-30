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

type ButtonSize = "large" | "medium" | "small";
type ButtonVariant = "ghost" | "normal";

interface ButtonProps {
  size?: ButtonSize;
  variant?: ButtonVariant;
  onPress: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  size = "medium",
  variant = "normal",
  onPress,
  children,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, sizeStyles[size], variantStyles[variant]]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, textSize[size]]}>{children}</Text>
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
    backgroundColor: theme.colors.actionPrimary.default,
  },
  text: {
    color: theme.colors.neutral.white,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  large: { paddingVertical: 14 },
  medium: { paddingVertical: 8 },
  small: { paddingVertical: 4 },
};

const textSize: Record<ButtonSize, TextStyle> = {
  large: { ...parseTextStyle(theme.typography.actionButton.large) },
  medium: { ...parseTextStyle(theme.typography.actionButton.medium) },
  small: { ...parseTextStyle(theme.typography.actionButton.small) },
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  normal: {},
  ghost: { backgroundColor: "transparent", borderWidth: 1 },
};

export default Button;
