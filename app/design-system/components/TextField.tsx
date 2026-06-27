import React, { useState } from "react";
import { View, TextInput, TextInputProps } from "react-native";
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

/** Text input with default / focus / error states. Pass `multiline` for a textarea. */
export const TextField: React.FC<TextFieldProps> = ({ label, error, leftIcon, onFocus, onBlur, multiline, numberOfLines, ...rest }) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.input.error : focused ? colors.input.borderFocus : colors.input.border;
  const minHeight = multiline ? (numberOfLines ?? 4) * 22 + 28 : 56;

  return (
    <View>
      {label ? (
        <Text variant="label" color="secondary" style={{ marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}
      <View
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
          style={{ flex: 1, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.text.primary, padding: 0 }}
        />
      </View>
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
};
