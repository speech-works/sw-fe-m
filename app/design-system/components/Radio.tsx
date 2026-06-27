import React from "react";
import { View } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { opacity } from "../primitives/scale";
import { Text } from "./Text";

export interface RadioProps {
  selected: boolean;
  onSelect: () => void;
  label?: string;
  disabled?: boolean;
}

/** Circular single-select control. Selected = brand ring + filled dot. */
export const Radio: React.FC<RadioProps> = ({ selected, onSelect, label, disabled = false }) => {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={disabled ? undefined : onSelect}
      disabled={disabled}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: disabled ? opacity.disabled : 1 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: selected ? colors.action.primary : colors.border.strong,
        }}
      >
        {selected ? (
          <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: colors.action.primary }} />
        ) : null}
      </View>
      {label ? <Text variant="body">{label}</Text> : null}
    </PressableScale>
  );
};

export interface RadioGroupOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: RadioGroupOption<T>[];
}

/** Vertical group of radios sharing one value (convenience over <Radio>). */
export function RadioGroup<T extends string>({ value, onChange, options }: RadioGroupProps<T>) {
  return (
    <View style={{ gap: 16 }}>
      {options.map((o) => (
        <Radio
          key={o.value}
          selected={o.value === value}
          onSelect={() => onChange(o.value)}
          label={o.label}
          disabled={o.disabled}
        />
      ))}
    </View>
  );
}
