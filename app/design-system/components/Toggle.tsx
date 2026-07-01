import React from "react";
import { Pressable } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../useTheme";
import { opacity } from "../primitives/scale";
import { duration, easing } from "../motion";

export interface ToggleProps {
  value: boolean;
  /**
   * Flip handler. **Omit** to render a display-only switch with NO press target of its
   * own — for use inside a larger pressable row that owns the tap (the visual still
   * animates from `value`). With it, the switch is self-contained and interactive.
   */
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

/** Themed switch — orange when on, control surface when off; animated thumb. */
export const Toggle: React.FC<ToggleProps> = ({ value, onChange, disabled }) => {
  const { colors } = useTheme();
  const v = useDerivedValue(
    () => withTiming(value ? 1 : 0, { duration: duration.base, easing: easing.out }),
    [value],
  );
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], [colors.surface.control, colors.action.primary]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(v.value, [0, 1], [2, 22]) }],
  }));

  // The visual — identical whether interactive or display-only, so every switch in the
  // app shares one size/shape/animation.
  const visual = (
    <Animated.View
      style={[{ width: 50, height: 30, borderRadius: 15, justifyContent: "center", opacity: disabled ? opacity.disabled : 1 }, trackStyle]}
    >
      <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface.inverse }, thumbStyle]} />
    </Animated.View>
  );

  // Display-only (no onChange): no Pressable, so it can nest inside a parent pressable
  // without creating a competing tap target.
  if (!onChange) return visual;

  return (
    <Pressable disabled={disabled} onPress={() => onChange(!value)} hitSlop={8}>
      {visual}
    </Pressable>
  );
};
