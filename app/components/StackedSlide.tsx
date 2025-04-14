import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

interface StackedCardSwiperProps {
  cards: React.ReactNode[];
}

const StackedCardSwiper = ({ cards }: StackedCardSwiperProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [disabled, setDisabled] = useState(false);

  // Animation values
  const frontCardPos = useSharedValue(0);
  const backCardPos = useSharedValue(0);
  const frontCardVisible = useSharedValue(1);
  const buttonRotate = useSharedValue(0);
  const zIndices = {
    front: useSharedValue(2),
    back: useSharedValue(1),
  };

  // Front card animation
  const frontCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: frontCardPos.value },
      { rotateY: `${frontCardPos.value / -10}deg` },
    ],
    zIndex: zIndices.front.value,
  }));

  // Back card animation
  const backCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: backCardPos.value * 0.3 },
      { translateY: backCardPos.value * -0.15 },
    ],
    zIndex: zIndices.back.value,
  }));

  // Button animation
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${buttonRotate.value}deg` }],
  }));

  // Content wrapper style to handle opacity separately
  const frontCardContentStyle = useAnimatedStyle(() => ({
    opacity: frontCardVisible.value,
  }));

  const swapCards = () => {
    if (disabled || cards.length < 2) return;
    setDisabled(true);

    // 1. Button animation
    buttonRotate.value = withSequence(
      withTiming(70, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );

    // 2. Hide the front card content
    frontCardVisible.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        // 3. Move the front card out
        frontCardPos.value = withTiming(
          -300,
          { duration: 300 },
          (moveFinished) => {
            if (moveFinished) {
              // 4. Move back card to center
              backCardPos.value = withTiming(0, { duration: 200 }, () => {
                runOnJS(completeSwap)();
              });
            }
          }
        );
      }
    });
  };

  const completeSwap = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    // Reset positions without animation
    frontCardPos.value = 0;
    backCardPos.value = 0;

    // Make content visible again after reset
    frontCardVisible.value = withTiming(1, { duration: 0 }); // Reset immediately

    setDisabled(false);
  };

  const nextIndex = (currentIndex + 1) % cards.length;

  return (
    <View style={styles.wrapper}>
      {/* Back Card */}
      <Animated.View style={[styles.card, styles.backCard, backCardStyle]}>
        {cards[nextIndex]}
      </Animated.View>

      {/* Front Card */}
      <Animated.View style={[styles.card, styles.frontCard, frontCardStyle]}>
        <Animated.View style={[{ flex: 1 }, frontCardContentStyle]}>
          {cards[currentIndex]}
        </Animated.View>
      </Animated.View>

      {/* Swap Button */}
      <Animated.View style={[styles.swapButton, buttonStyle]}>
        <Pressable onPress={swapCards} disabled={disabled}>
          <Icon name="swap-horiz" size={24} color="#666" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginHorizontal: 20,
    marginVertical: 24,
    minHeight: 360,
  },
  card: {
    borderRadius: 12,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  frontCard: {
    backgroundColor: "#fff",
    width: "100%",
    height: "100%",
  },
  backCard: {
    backgroundColor: "#fff",
    width: "94%",
    height: "96%",
    top: 8,
    right: 12,
  },
  swapButton: {
    position: "absolute",
    top: "50%",
    right: -30,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "#666",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 3,
  },
});

export default StackedCardSwiper;
