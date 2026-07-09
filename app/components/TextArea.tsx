import React, { forwardRef } from "react";
import {
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";
import { makeStyles, useTheme } from "../design-system";

interface TextAreaProps extends TextInputProps {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle | TextStyle[];
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
    const styles = useStyles();
    const { colors } = useTheme();
    // Ensure inputStyle is always treated as an array
    const normalizedInputStyle = Array.isArray(inputStyle)
      ? inputStyle
      : inputStyle
      ? [inputStyle]
      : [];

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { height: 24 * numberOfLines },
            ...normalizedInputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.input.placeholder}
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

const useStyles = makeStyles((c, t) => ({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: c.input.bg,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: c.text.primary,
    padding: 0,
    margin: 0,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
}));
