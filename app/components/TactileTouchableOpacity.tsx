import React, { useCallback, useState } from "react";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import { haptics } from "../design-system/haptics";

interface TactileTouchableOpacityProps extends TouchableOpacityProps {
  /**
   * Duration in ms to disable the button after a press.
   * @default 1000
   */
  debounceTime?: number;
  /**
   * Light tick on press. Off by default, same reasoning as `PressableScale`:
   * a shared wrapper that buzzes unless told otherwise ends up buzzing
   * everywhere.
   * @default false
   */
  hapticFeedback?: boolean;
}

/**
 * A wrapper around TouchableOpacity that provides:
 * 1. Optional haptic feedback on press.
 * 2. Debouncing to prevent accidental double-clicks.
 */
export const TactileTouchableOpacity: React.FC<
  TactileTouchableOpacityProps
> = ({
  onPress,
  debounceTime = 1000,
  hapticFeedback = false,
  disabled,
  children,
  ...props
}) => {
  const [isDebounced, setIsDebounced] = useState(false);

  const handlePress = useCallback(
    (event: any) => {
      if (isDebounced) return;

      // A real light impact, not the alert buzz. `Vibration.vibrate(10)` used
      // to sit here: iOS ignores that number and plays the full system alert
      // vibration, the same one an incoming message makes.
      if (hapticFeedback) haptics.light();

      // Debounce
      setIsDebounced(true);
      setTimeout(() => {
        setIsDebounced(false);
      }, debounceTime);

      // Call original handler
      if (onPress) {
        onPress(event);
      }
    },
    [onPress, debounceTime, hapticFeedback, isDebounced],
  );

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled || isDebounced}
      activeOpacity={props.activeOpacity || 0.7}
    >
      {children}
    </TouchableOpacity>
  );
};
