import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface SkeletonLoaderProps {
  width: number | `${number}%` | "auto";
  height: number | `${number}%` | "auto";
  style?: ViewStyle;
}

/**
 * A simple gray‐shaded bubble that pulses its opacity.
 * You can pass a width/height or % to match chat‐bubble dimensions.
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: "#e0e0e0",
          borderRadius: 16,
          width: width,
          height: height,
          opacity: opacity,
        },
        style,
      ]}
    />
  );
};

export default SkeletonLoader;
