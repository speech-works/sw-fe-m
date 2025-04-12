import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { parseTextStyle } from "../util/functions/parseFont";
import { theme } from "../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";

type ButtonSize = "large" | "medium" | "small" | "xSmall";
type ButtonVariant = "ghost" | "normal";

interface ButtonProps {
  size?: ButtonSize;
  variant?: ButtonVariant;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  leftIcon?: string; // Optional left icon
  rightIcon?: string; // Optional right icon
}

const Button: React.FC<ButtonProps> = ({
  size = "medium",
  variant = "normal",
  onPress,
  children,
  disabled = false,
  leftIcon,
  rightIcon,
}) => {
  // Calculate icon color based on the disabled prop.
  const iconColor = disabled
    ? theme.colors.neutral.white
    : textStyle[variant].color;

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
      <View style={styles.buttonContent}>
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={iconColor}
            style={styles.iconStyle}
          />
        )}
        <Text
          style={
            disabled
              ? [textSize[size], styles.disabled]
              : [textSize[size], textStyle[variant]]
          }
        >
          {children}
        </Text>
        {rightIcon && (
          <Icon
            name={rightIcon}
            size={20}
            color={iconColor}
            style={styles.iconStyle}
          />
        )}
      </View>
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
    color: theme.colors.neutral.white,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconStyle: {
    marginHorizontal: 4,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  large: { paddingVertical: 14 },
  medium: { paddingVertical: 8 },
  small: { paddingVertical: 4 },
  xSmall: { paddingVertical: 2 },
};

const textSize: Record<ButtonSize, TextStyle> = {
  large: { ...parseTextStyle(theme.typography.actionButton.large) },
  medium: { ...parseTextStyle(theme.typography.actionButton.medium) },
  small: { ...parseTextStyle(theme.typography.actionButton.small) },
  xSmall: { ...parseTextStyle(theme.typography.actionButton.small) },
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
