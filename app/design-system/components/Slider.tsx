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
  /** Override active track/thumb colour for context-themed flows. */
  accentColor?: string;
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
  accentColor,
}) => {
  const { colors } = useTheme();
  const activeColor = accentColor ?? colors.action.primary;

  /**
   * One tick per STEP CROSSED, not one per event.
   *
   * `onValueChange` fires continuously while a finger moves, so ticking on
   * every call turned a single drag into a rattle. A continuous slider (step 0)
   * has no natural notch, so it gets twenty over its range: enough to feel like
   * travel, few enough to stay a series of taps.
   */
  const span = maximumValue - minimumValue;
  const tickSize = step > 0 ? step : span > 0 ? span / 20 : 0;
  const lastTick = React.useRef<number | null>(null);

  const handleChange = (v: number) => {
    if (haptic && tickSize > 0) {
      const notch = Math.round(v / tickSize);
      if (lastTick.current !== notch) {
        lastTick.current = notch;
        haptics.selection();
      }
    }
    onValueChange(v);
  };
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
        onValueChange={handleChange}
        onSlidingComplete={onSlidingComplete}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={disabled ? colors.action.disabledText : activeColor}
        maximumTrackTintColor={colors.surface.row}
        thumbTintColor={Platform.OS === "android" ? activeColor : undefined}
        style={{ height: 36 }}
      />
    </View>
  );
};
