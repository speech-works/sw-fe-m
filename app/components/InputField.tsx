import React, {
  forwardRef, // <--- Import forwardRef
} from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme } from "../Theme/tokens";

interface InputFieldProps extends TextInputProps {
  /**
   * Optional style overrides for the outer container
   */
  containerStyle?: ViewStyle;
  /**
   * Optional style overrides for the TextInput itself
   */
  inputStyle?: TextStyle;
  /**
   * Optional React element to display on the right side of the input field.
   * Useful for icons (e.g., clear button, search icon).
   */
  rightIcon?: React.ReactElement | null;
  /**
   * Optional React element to display on the left side of the input field.
   * Useful for icons (e.g., search icon, prefix).
   */
  leftIcon?: React.ReactElement | null;
}

/**
 * A simple, reusable TextInput with consistent styling.
 */
// Use forwardRef to allow ref prop to be passed
const InputField = forwardRef<TextInput, InputFieldProps>(
  (
    {
      value,
      onChangeText,
      placeholder,
      containerStyle,
      inputStyle,
      leftIcon,
      rightIcon,
      ...rest
    },
    ref
  ) => {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.default}
          underlineColorAndroid="transparent"
          {...rest}
        />
        {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
      </View>
    );
  }
);

export default InputField;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface.elevated, // Moved from comment to active
    //borderRadius: 12,
    //paddingHorizontal: 12, // Ensure padding is applied
    //height: 48,
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.title,
    paddingVertical: 0, // centers text vertically inside the 48‐height container
    // No background color here, let the wrapper handle it
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4, // Add some padding for icons
  },
});
