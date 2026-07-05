import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    View,
    ViewStyle
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { elevation as elevationToken, Text, useTheme } from "../design-system";
import { TactileTouchableOpacity } from "./TactileTouchableOpacity";

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
  const { colors } = useTheme();
  // 4. --- Button is disabled if explicitly disabled OR loading ---
  const isDisabled = disabled || loading;

  // Determine button styles based on variant and disabled state
  const getButtonStyles = (): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [styles.buttonBase]; // Start with the base style

    if (isDisabled) {
      // Use combined isDisabled check
      baseStyles.push({ backgroundColor: colors.action.disabledBg });
    } else if (variant === "ghost") {
      baseStyles.push(styles.ghostButton);
      baseStyles.push({
        borderColor: textColor || colors.action.primary,
      });
    } else {
      // Normal variant
      baseStyles.push({
        backgroundColor: buttonColor || colors.action.primary,
      });

      // Apply elevation shadow only for normal, non-disabled buttons
      if (elevation === 1) {
        baseStyles.push(elevationToken.e1);
      } else if (elevation === 2) {
        baseStyles.push(elevationToken.e2);
      }
    }

    // Apply the custom style prop last to allow overrides
    if (style) {
      baseStyles.push(style);
    }

    return baseStyles;
  };

  // Determine text and icon color
  const getTextColor = (): string => {
    if (isDisabled) {
      // Use combined isDisabled check
      return colors.action.disabledText;
    }

    if (textColor) {
      return textColor;
    }

    // Default text colors based on variant (dark-on-orange for the solid fill)
    return variant === "normal" ? colors.action.onPrimary : colors.action.primary;
  };

  const iconColor = getTextColor();

  // NOTE: Removed the 'textSpacingStyle' logic as it was not being
  // applied and is made redundant by the `gap: 12` in `styles.buttonBase`.

  return (
    <TactileTouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isDisabled} // Use combined isDisabled check
    >
      {/* Overlay Spinner */}
      {loading && (
        <ActivityIndicator
          size="small"
          color={iconColor}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Preserve Content Layout (Invisible when loading) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: loading ? 0 : 1,
        }}
      >
        {leftIcon ? <Icon name={leftIcon} size={20} color={iconColor} /> : null}

        <Text variant="title" color={iconColor}>{text}</Text>

        {rightIcon ? (
          <Icon name={rightIcon} size={20} color={iconColor} />
        ) : null}
      </View>
    </TactileTouchableOpacity>
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
  ghostButton: {
    backgroundColor: "transparent",
    borderWidth: 1, // Default border for ghost, color set dynamically
  },
});

export default Button;
