import React, { forwardRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme } from "../Theme/tokens";

interface TextAreaProps extends TextInputProps {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  rightIcon?: React.ReactElement | null;
  leftIcon?: React.ReactElement | null;
}

/**
 * A multi-line TextArea component with consistent styling and optional icons.
 */
const TextArea = forwardRef<TextInput, TextAreaProps>(
  (
    {
      value,
      onChangeText,
      placeholder,
      containerStyle,
      inputStyle,
      leftIcon,
      rightIcon,
      numberOfLines = 4,
      ...rest
    },
    ref
  ) => {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[styles.input, { height: 24 * numberOfLines }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.default + "99"}
          underlineColorAndroid="transparent"
          multiline
          textAlignVertical="top"
          numberOfLines={numberOfLines}
          {...rest}
        />
        {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
      </View>
    );
  }
);

export default TextArea;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.title,
    padding: 0,
    margin: 0,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    marginTop: 4,
  },
});
