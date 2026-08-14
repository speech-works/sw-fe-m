import React from "react";
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { spring } from "../design-system/motion";
import { haptics } from "../design-system/haptics";
import { notePress } from "../util/diagnostics/deadTap";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  /** Scale to shrink to while pressed (default 0.97). */
  scaleTo?: number;
  /**
   * Light tick on a COMPLETED tap. Off by default, and it has to stay that way.
   *
   * This is the single most-used control in the app: 100-odd call sites across
   * 70 files, plus every design-system control built on it (Button, IconButton,
   * Chip, ListItem, Checkbox, Radio, Segmented, TextLink). Defaulting to ON
   * meant the phone buzzed on every tap anywhere, which is exactly what testers
   * reported. Switch it on for the few actions that need confirming by feel,
   * where the screen alone does not say what happened.
   */
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
  haptic = false,
  style,
  children,
  onPress,
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
    // Tells the dead-tap detector this touch reached a real control. Reported on
    // press-IN rather than press-out so a tap that starts correctly but is later
    // cancelled by a scroll is not counted as dead.
    notePress();
    if (!reduceMotion) scale.value = withSpring(scaleTo, spring.press);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!reduceMotion) scale.value = withSpring(1, spring.press);
    onPressOut?.(e);
  };

  /**
   * The tick belongs on the COMPLETED tap, not on press-in.
   *
   * Press-in fires the instant a finger lands, including on the finger that is
   * about to scroll a list. Every flick that started on a card buzzed, and
   * nothing had been pressed. `onPress` only fires when the touch really was a
   * tap, which is also the only moment a confirmation means anything.
   */
  const handlePress =
    onPress || haptic
      ? (e: GestureResponderEvent) => {
          if (haptic && !disabled) haptics.light();
          onPress?.(e);
        }
      : // Stay undefined when the caller gave no handler and wants no tick. A
        // Pressable with an onPress reads as a button to a screen reader, and
        // some cells here are deliberately inert.
        undefined;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
