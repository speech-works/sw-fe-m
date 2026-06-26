import React from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../useTheme";
import { opacity } from "../primitives/scale";

export interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

/** Themed switch — orange when on, control surface when off; animated thumb. */
export const Toggle: React.FC<ToggleProps> = ({ value, onChange, disabled }) => {
  const { colors } = useTheme();
  const v = useDerivedValue(
    () => withTiming(value ? 1 : 0, { duration: 160, easing: Easing.out(Easing.quad) }),
    [value],
  );
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], [colors.surface.control, colors.action.primary]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(v.value, [0, 1], [2, 22]) }],
  }));
  return (
    <Pressable disabled={disabled} onPress={() => onChange(!value)} hitSlop={8}>
      <Animated.View
        style={[{ width: 50, height: 30, borderRadius: 15, justifyContent: "center", opacity: disabled ? opacity.disabled : 1 }, trackStyle]}
      >
        <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface.inverse }, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};
