import React from "react";
import { View, Platform } from "react-native";
import RNSlider from "@react-native-community/slider";
import { useTheme } from "../useTheme";
import { haptics } from "../haptics";
import { Text } from "./Text";

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  label?: string;
  /** Show the live value on the right of the label row. */
  showValue?: boolean;
  /** Format the displayed value (default: rounded). */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  /** Fire a selection tick on change (default true). */
  haptic?: boolean;
}

/** Themed range input — brand track + thumb, optional label/value row. */
export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  onSlidingComplete,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  label,
  showValue = false,
  formatValue = (v) => `${Math.round(v)}`,
  disabled = false,
  haptic = true,
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label || showValue ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {label ? (
            <Text variant="label" color="secondary">
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showValue ? (
            <Text variant="label" color="primary">
              {formatValue(value)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <RNSlider
        value={value}
        onValueChange={(v) => {
          if (haptic) haptics.selection();
          onValueChange(v);
        }}
        onSlidingComplete={onSlidingComplete}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={disabled ? colors.action.disabledText : colors.action.primary}
        maximumTrackTintColor={colors.surface.row}
        thumbTintColor={Platform.OS === "android" ? colors.action.primary : undefined}
        style={{ height: 36 }}
      />
    </View>
  );
};
