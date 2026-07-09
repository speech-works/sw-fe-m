import React, { useState } from "react";
import { View, TextInput, TextInputProps, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../useTheme";
import { radius, space, size } from "../primitives/scale";
import { fonts } from "../primitives/fonts";
import { Icon } from "./Icon";

export interface SearchFieldProps extends Omit<TextInputProps, "style"> {
  /** Called when the clear (×) button is tapped. */
  onClear?: () => void;
}

/** Pill search input — leading magnifier, clear button when non-empty. */
export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onClear,
  onFocus,
  onBlur,
  placeholder = "Search",
  ...rest
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const hasValue = !!value && value.length > 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.iconText,
        height: 48,
        paddingHorizontal: 16,
        borderRadius: radius.pill,
        backgroundColor: colors.input.bg,
        borderWidth: 1,
        borderColor: focused ? colors.input.borderFocus : colors.input.border,
      }}
    >
      <Icon name="search" size={size.icon} color={colors.text.tertiary} />
      <TextInput
        {...rest}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.input.placeholder}
        returnKeyType="search"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{ flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text.primary, padding: 0 }}
      />
      {hasValue ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.surface.control,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border.strong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="x" size={14} color={colors.text.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
};
