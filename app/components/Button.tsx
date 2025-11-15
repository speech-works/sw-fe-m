import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  ActivityIndicator, // 1. --- Import ActivityIndicator ---
} from "react-native";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";
import { theme } from "../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";

/**
 * @typedef {'ghost' | 'normal'} ButtonVariant
 */
type ButtonVariant = "ghost" | "normal";

interface ButtonProps {
  /**
   * The visual variant of the button.
   * - 'normal': A solid background button.
   * - 'ghost': A transparent background button with colored text.
   * @default 'normal'
   */
  variant?: ButtonVariant;
  /**
   * Callback function to be executed when the button is pressed.
   */
  onPress: () => void;
  /**
   * The text displayed inside the button.
   */
  text: string;
  /**
   * If true, the button will be disabled and non-interactive.
   * @default false
   */
  disabled?: boolean;
  /**
   * If true, the button will be disabled and show a spinner
   * in place of the `leftIcon`.
   * @default false
   */
  loading?: boolean; // 2. --- Add loading prop ---
  /**
   * Name of the MaterialIcons icon to display on the left side of the text.
   */
  leftIcon?: string;
  /**
   * Name of the MaterialIcons icon to display on the right side of the text.
   */
  rightIcon?: string;
  /**
   * Overrides the default background color of the button.
   * This prop is primarily effective for the 'normal' variant.
   */
  buttonColor?: string;
  /**
   * Overrides the default text color of the button.
   * This prop affects both text and icon colors.
   */
  textColor?: string;
  /**
   * Optional custom style for the button container.
   */
  style?: ViewStyle;
  /**
   * Controls the shadow depth of the button.
   * - 1: Applies a subtle shadow (default).
   * - 2: Applies a more pronounced shadow.
   * This prop is only effective for the 'normal' variant when not disabled.
   * @default 1
   */
  elevation?: 1 | 2;
}

const Button: React.FC<ButtonProps> = ({
  variant = "normal",
  onPress,
  text,
  disabled = false,
  loading = false, // 2. --- Destructure loading prop ---
  leftIcon,
  rightIcon,
  buttonColor,
  textColor,
  style,
  elevation = 1,
}) => {
  // 4. --- Button is disabled if explicitly disabled OR loading ---
  const isDisabled = disabled || loading;

  // Determine button styles based on variant and disabled state
  const getButtonStyles = (): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [styles.buttonBase]; // Start with the base style

    if (isDisabled) {
      // Use combined isDisabled check
      baseStyles.push(styles.disabledButton);
    } else if (variant === "ghost") {
      baseStyles.push(styles.ghostButton);
      baseStyles.push({
        borderColor: textColor || theme.colors.actionPrimary.default,
      });
    } else {
      // Normal variant
      baseStyles.push(styles.normalButton);
      baseStyles.push({
        backgroundColor: buttonColor || theme.colors.actionPrimary.default,
      });

      // Apply elevation shadow only for normal, non-disabled buttons
      if (elevation === 1) {
        baseStyles.push(styles.elevation1);
      } else if (elevation === 2) {
        baseStyles.push(styles.elevation2);
      }
    }

    // Apply the custom style prop last to allow overrides
    if (style) {
      baseStyles.push(style);
    }

    return baseStyles;
  };

  // Determine text and icon color
  const getTextColor = (): TextStyle => {
    if (isDisabled) {
      // Use combined isDisabled check
      return styles.disabledText;
    }

    if (textColor) {
      return { color: textColor };
    }

    // Default text colors based on variant
    return variant === "normal" ? styles.normalText : styles.ghostText;
  };

  const buttonTextStyle = getTextColor();
  const iconColor = buttonTextStyle.color as string; // Cast as string for spinner

  // NOTE: Removed the 'textSpacingStyle' logic as it was not being
  // applied and is made redundant by the `gap: 12` in `styles.buttonBase`.

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isDisabled} // Use combined isDisabled check
    >
      {/* 3. --- Render spinner OR leftIcon --- */}
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : leftIcon ? (
        <Icon name={leftIcon} size={20} color={iconColor} />
      ) : null}

      <Text style={[styles.buttonTextBase, buttonTextStyle]}>{text}</Text>

      {/* Also hide rightIcon when loading for a cleaner look */}
      {!loading && rightIcon ? (
        <Icon name={rightIcon} size={20} color={iconColor} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12, // This property handles spacing between icon/text
    borderRadius: 16,
    padding: 16,
    minHeight: 52, // Added to ensure consistent height
  },
  normalButton: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderWidth: 1, // Default border for ghost, color set dynamically
  },
  elevation1: {
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  elevation2: {
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  disabledButton: {
    backgroundColor: theme.colors.actionPrimary.disabled,
  },
  buttonTextBase: {
    ...parseTextStyle(theme.typography.Button),
  },
  normalText: {
    color: theme.colors.text.onDark,
  },
  ghostText: {
    color: theme.colors.actionPrimary.default,
  },
  disabledText: {
    color: theme.colors.text.disabled,
  },
});

export default Button;
