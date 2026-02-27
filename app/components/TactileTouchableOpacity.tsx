import React, { useCallback, useState } from "react";
import {
    Platform,
    TouchableOpacity,
    TouchableOpacityProps,
    Vibration,
} from "react-native";
// import * as Haptics from 'expo-haptics'; // Not installed, using Vibration fallback

interface TactileTouchableOpacityProps extends TouchableOpacityProps {
  /**
   * Duration in ms to disable the button after a press.
   * @default 1000
   */
  debounceTime?: number;
  /**
   * Whether to trigger haptic feedback on press.
   * @default true
   */
  hapticFeedback?: boolean;
}

/**
 * A wrapper around TouchableOpacity that provides:
 * 1. Haptic feedback on press (using Vibration as fallback).
 * 2. Debouncing to prevent accidental double-clicks.
 */
export const TactileTouchableOpacity: React.FC<
  TactileTouchableOpacityProps
> = ({
  onPress,
  debounceTime = 1000,
  hapticFeedback = true,
  disabled,
  children,
  ...props
}) => {
  const [isDebounced, setIsDebounced] = useState(false);

  const handlePress = useCallback(
    (event: any) => {
      if (isDebounced) return;

      // Trigger Haptics
      if (hapticFeedback) {
        // Simple fallback vibration
        // In a real app with expo-haptics: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (Platform.OS === "bg") {
          // no-op
        } else {
          Vibration.vibrate(10); // Short vibration
        }
      }

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
