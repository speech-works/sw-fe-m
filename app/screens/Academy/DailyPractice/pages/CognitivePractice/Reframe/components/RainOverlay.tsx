import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const { width, height: screenHeight } = Dimensions.get("window");
const NUM_DROPS = 100;

interface RainDropProps {
  index: number;
}

const RainDrop: React.FC<RainDropProps> = ({ index }) => {
  // Random properties for this drop
  const randomX = Math.random() * width;
  const randomDelay = Math.random() * 2000; // Reduced from 3000
  const randomDuration = 2500 + Math.random() * 1500; // 2.5-4 seconds (faster)
  const randomHeight = 15 + Math.random() * 25; // 15-40px
  const randomWidth = Math.random() < 0.2 ? 2 : 1; // Mostly 1px, some 2px

  const translateY = useSharedValue(-50);

  useEffect(() => {
    // Start animation after random delay
    translateY.value = withDelay(
      randomDelay,
      withRepeat(
        withTiming(screenHeight + 50, {
          duration: randomDuration,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateY.value * 0.03 }, // Slight diagonal movement
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: randomX,
          height: randomHeight,
          width: randomWidth,
        },
        animatedStyle,
      ]}
    />
  );
};

const RainOverlay: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Rain drops */}
      {Array.from({ length: NUM_DROPS }).map((_, index) => (
        <RainDrop key={index} index={index} />
      ))}

      {/* Water accumulation at bottom */}
      <WaterLevel />
    </View>
  );
};

const WaterLevel: React.FC = () => {
  const waterHeight = useSharedValue(0.25);
  const wave1Offset = useSharedValue(0);
  const wave2Offset = useSharedValue(0);
  const swivelOffset = useSharedValue(0); // New: for swiveling motion

  useEffect(() => {
    // Gradually rise from 0.25px to 5px over 3 minutes (180 seconds)
    waterHeight.value = withTiming(5, {
      duration: 180000,
      easing: Easing.out(Easing.quad),
    });

    // Wave 1 - slower horizontal movement
    wave1Offset.value = withRepeat(
      withTiming(width, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Wave 2 - faster horizontal movement for layered effect
    wave2Offset.value = withRepeat(
      withTiming(width * 1.5, {
        duration: 6000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Swivel/bobbing motion - gentle up and down
    swivelOffset.value = withRepeat(
      withTiming(1.5, {
        duration: 2500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true // Reverse for smooth back-and-forth
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    return {
      height: waterHeight.value,
    };
  });

  const wave1Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -wave1Offset.value },
        { translateY: swivelOffset.value }, // Add vertical swivel
      ],
    };
  });

  const wave2Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -wave2Offset.value },
        { translateY: -swivelOffset.value }, // Opposite swivel for layered effect
      ],
    };
  });

  // Create irregular wave path for realistic water surface
  const createWavePath = (offset: number = 0) => {
    const waveWidth = width * 2;
    const waveHeight = 3;

    return `
      M0,${waveHeight}
      Q${waveWidth * 0.15},${waveHeight - 1.5} ${waveWidth * 0.3},${waveHeight}
      T${waveWidth * 0.6},${waveHeight}
      T${waveWidth * 0.9},${waveHeight}
      T${waveWidth},${waveHeight}
      L${waveWidth},10 L0,10 Z
    `;
  };

  return (
    <Animated.View style={[styles.waterContainer, containerStyle]}>
      {/* Wave layer 1 - background */}
      <Animated.View style={[styles.waveLayer, wave1Style]}>
        <Svg width={width * 2} height={10} viewBox={`0 0 ${width * 2} 10`}>
          <Path d={createWavePath(0)} fill="rgba(147, 197, 253, 0.4)" />
        </Svg>
      </Animated.View>

      {/* Wave layer 2 - foreground */}
      <Animated.View style={[styles.waveLayer, wave2Style]}>
        <Svg width={width * 2} height={10} viewBox={`0 0 ${width * 2} 10`}>
          <Path d={createWavePath(50)} fill="rgba(191, 219, 254, 0.6)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  drop: {
    position: "absolute",
    top: -50,
    backgroundColor: "#475569", // Slate 600
    opacity: 0.6,
    borderRadius: 0.5,
  },
  waterContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  waveLayer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: width * 2,
  },
});

export default RainOverlay;
