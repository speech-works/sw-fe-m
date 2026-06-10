import React from "react";
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  Vibration,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { mass: 0.4, damping: 14, stiffness: 240 } as const;

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  /** Scale to shrink to while pressed (default 0.97). */
  scaleTo?: number;
  /** Short haptic tick on press-in (default true). */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * A Pressable that springs to `scaleTo` while pressed — the "buttons must feel
 * responsive" press feedback the app otherwise lacks. Respects reduced-motion
 * (no scale, haptic still fires) and is hardware-accelerated via Reanimated.
 */
const PressableScale = ({
  scaleTo = 0.97,
  haptic = true,
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) => {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!reduceMotion) scale.value = withSpring(scaleTo, SPRING);
    if (haptic && !disabled) Vibration.vibrate(8);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!reduceMotion) scale.value = withSpring(1, SPRING);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
