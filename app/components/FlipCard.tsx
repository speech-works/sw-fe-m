import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../Theme/tokens";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";

interface FlipSlideProps {
  children: React.ReactNode;
  backCardContent: React.ReactNode;
}

const FlipSlide = ({ children, backCardContent }: FlipSlideProps) => {
  const animation = useSharedValue(0);
  const buttonRotation = useSharedValue(0);
  const isFlipped = useSharedValue(false);

  const [disabled, setDisabled] = useState(false);

  const rotateFront = useAnimatedStyle(() => {
    const translateX = interpolate(
      animation.value,
      [0, 1],
      [0, -200],
      Extrapolate.CLAMP
    );
    const rotateZ = interpolate(
      animation.value,
      [0, 1],
      [0, -15],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX },
        { rotateZ: `${rotateZ}deg` },
        { perspective: 800 },
      ],
      opacity: interpolate(animation.value, [0, 1], [1, 0], Extrapolate.CLAMP),
    };
  });

  const rotateBack = useAnimatedStyle(() => {
    const rotateY = interpolate(
      animation.value,
      [0, 1],
      [90, 0],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotateY}deg` }],
      opacity: interpolate(animation.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    };
  });

  const swapButtonStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      buttonRotation.value,
      [0, 1, 2],
      [0, 70, 0],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ perspective: 600 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const onSwap = () => {
    if (disabled) return;
    setDisabled(true);

    // Button 3D rotation animation
    buttonRotation.value = withTiming(1, { duration: 150 }, () => {
      buttonRotation.value = withTiming(2, { duration: 150 });
    });

    // Get next value for flip
    const nextValue = !isFlipped.value;
    isFlipped.value = nextValue;

    // Animate card flip
    animation.value = withTiming(nextValue ? 1 : 0, { duration: 600 }, () => {
      runOnJS(setDisabled)(false);
    });
  };

  return (
    <View style={styles.wrapper}>
      {/* Back Card */}
      <Animated.View style={[styles.backCard, rotateBack]}>
        {backCardContent}
      </Animated.View>

      {/* Front Card */}
      <Animated.View style={[styles.frontCard, rotateFront]}>
        {children}
      </Animated.View>

      {/* 3D Flip Swap Button */}
      <Animated.View style={[styles.swapButton, swapButtonStyle]}>
        <Pressable onPress={onSwap} disabled={disabled}>
          <Icon name="swap-horiz" size={24} color="#666" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default FlipSlide;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginHorizontal: 20,
    marginVertical: 24,
    height: 360,
  },
  frontCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  backCard: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 20,
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  swapButton: {
    position: "absolute",
    top: "50%",
    right: -30,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: theme.colors.neutral[5],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
});
