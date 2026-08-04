import React, { useRef, useState } from "react";
import { View, Pressable, TextInput, TextInputProps } from "react-native";
import { useTheme } from "../useTheme";
import { radius, space } from "../primitives/scale";
import { fonts } from "../primitives/fonts";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: IconName;
}

/** Text input with default / focus / error states. Pass `multiline` for a textarea.
 *  Forwards a ref to the underlying `TextInput` so callers can focus/blur it. */
export const TextField = React.forwardRef<TextInput, TextFieldProps>(
  ({ label, error, leftIcon, onFocus, onBlur, multiline, numberOfLines, ...rest }, ref) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const borderColor = error ? colors.input.error : focused ? colors.input.borderFocus : colors.input.border;
  const minHeight = multiline ? (numberOfLines ?? 4) * 22 + 28 : 56;

  // Keep our own handle (for the tap-anywhere focus below) AND honour the caller's ref.
  const attachRef = (node: TextInput | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <View>
      {label ? (
        <Text variant="label" color="secondary" style={{ marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}
      {/* The whole bordered box is the tap target — a tap on the padding, the icon,
          or (on a textarea) the empty space under the text focuses the input, instead
          of only the one line the TextInput itself occupies. */}
      <Pressable
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: space.iconText,
          minHeight,
          paddingHorizontal: 18,
          paddingVertical: multiline ? 14 : 0,
          borderRadius: radius.input,
          backgroundColor: colors.input.bg,
          borderWidth: 1,
          borderColor,
        }}
      >
        {leftIcon ? (
          <Icon name={leftIcon} size={20} color={colors.text.tertiary} />
        ) : null}
        <TextInput
          {...rest}
          ref={attachRef}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.input.placeholder}
          style={{
            flex: 1,
            // A textarea must fill the box's height, not just its first line — otherwise
            // taps below the caret land on dead space and can't position the cursor.
            alignSelf: multiline ? "stretch" : undefined,
            fontFamily: fonts.regular,
            fontSize: 16,
            lineHeight: 22,
            color: colors.text.primary,
            padding: 0,
          }}
        />
      </Pressable>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
          <Icon name="alert-circle" size={14} color={colors.feedback.dangerText} />
          <Text variant="bodySm" color={colors.feedback.dangerText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

TextField.displayName = "TextField";
