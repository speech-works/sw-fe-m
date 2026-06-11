import React from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface ReactionWrapperProps {
  children: React.ReactNode;
  selected: boolean;
  onPress?: () => void;
  size?: number;
}

export default function ReactionWrapper({
  children,
  selected,
  onPress,
  size = 32,
}: ReactionWrapperProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // If no onPress is provided, we just render a View.
  // This prevents touch interception when nested inside other touchables.
  const WrapperComponent = onPress ? Pressable : View;

  return (
    <WrapperComponent
      onPress={onPress}
      onPressIn={onPress ? () => (scale.value = withSpring(1.2)) : undefined}
      onPressOut={onPress ? () => (scale.value = withSpring(1)) : undefined}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            // If it has no onPress, it's either in the picker or a display badge, so full opacity
            opacity: selected || !onPress ? 1 : 0.6,
            justifyContent: "center",
            alignItems: "center",
          },
          animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </WrapperComponent>
  );
}
