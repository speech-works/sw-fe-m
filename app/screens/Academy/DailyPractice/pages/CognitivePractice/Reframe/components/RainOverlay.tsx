import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

const NUM_DROPS = 30; // Number of raindrops
const { width } = Dimensions.get("window");

const RainDrop = ({ index }: { index: number }) => {
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(0.8);

  // Randomize start position and speed
  const randomX = Math.random() * 100; // percent
  const duration = 800 + Math.random() * 1500;
  const delay = Math.random() * 2000;

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(200, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, {
          duration: duration * 0.8,
          easing: Easing.in(Easing.linear),
        }), // Fade out near bottom
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: `${randomX}%`,
          height: 10 + Math.random() * 20, // Random length
        },
        animatedStyle,
      ]}
    />
  );
};

const RainOverlay = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: NUM_DROPS }).map((_, i) => (
        <RainDrop key={i} index={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0,
  },
  drop: {
    position: "absolute",
    top: -20,
    width: 1.5,
    backgroundColor: "#9ca3af", // Gray rain
    borderRadius: 1,
  },
});

export default RainOverlay;
