import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Path,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";

const { width } = Dimensions.get("window");

const SunshineOverlay: React.FC = () => {
  const sunGlow = useSharedValue(1);
  const sunOpacity = useSharedValue(1);
  const treeShimmer = useSharedValue(0.7);

  useEffect(() => {
    // Pulsing sun glow effect - more pronounced breathing
    sunGlow.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Pulsing opacity for extra glow effect
    sunOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Trees shimmer in sun's light
    treeShimmer.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.7, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const sunStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sunGlow.value }],
      opacity: sunOpacity.value,
    };
  });

  const treeStyle = useAnimatedStyle(() => {
    return {
      opacity: treeShimmer.value,
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Bright Blue Sky Background */}
      <View style={styles.skyBackground} />

      {/* Bright Sun - positioned at top-left, behind trees */}
      <Animated.View style={[styles.sunContainer, sunStyle]}>
        <Svg width={90} height={90} viewBox="0 0 90 90">
          <Defs>
            <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FEFCE8" stopOpacity="1" />
              <Stop offset="20%" stopColor="#FEF08A" stopOpacity="1" />
              <Stop offset="40%" stopColor="#FDE047" stopOpacity="0.95" />
              <Stop offset="60%" stopColor="#FACC15" stopOpacity="0.75" />
              <Stop offset="80%" stopColor="#EAB308" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
              <Stop offset="50%" stopColor="#FBBF24" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Outer glow layer */}
          <Circle cx="45" cy="45" r="42" fill="url(#outerGlow)" />
          {/* Main sun */}
          <Circle cx="45" cy="45" r="30" fill="url(#sunGlow)" />
        </Svg>
      </Animated.View>

      {/* Dense Forest - taller trees, in front of sun */}
      <Animated.View style={[styles.forestContainer, treeStyle]}>
        <Svg
          width={width}
          height={120}
          viewBox={`0 0 ${width} 120`}
          preserveAspectRatio="none"
        >
          {/* Dense Tall Trees - Back Layer (Darkest) - scaled to full width */}
          <Path
            d={`M${-width * 0.1} 120 L ${width * 0.05} 5 L ${
              width * 0.2
            } 120 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.1} 120 L ${width * 0.25} 0 L ${width * 0.4} 120 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.35} 120 L ${width * 0.5} 8 L ${
              width * 0.65
            } 120 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.6} 120 L ${width * 0.75} 2 L ${width * 0.9} 120 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.85} 120 L ${width * 1.0} 6 L ${
              width * 1.15
            } 120 Z`}
            fill="#064E3B"
          />

          {/* Mid Layer Trees - lighter green */}
          <Path
            d={`M${0} 120 L ${width * 0.15} 18 L ${width * 0.3} 120 Z`}
            fill="#14532D"
            opacity={0.85}
          />
          <Path
            d={`M${width * 0.25} 120 L ${width * 0.4} 14 L ${
              width * 0.55
            } 120 Z`}
            fill="#14532D"
            opacity={0.85}
          />
          <Path
            d={`M${width * 0.5} 120 L ${width * 0.65} 16 L ${
              width * 0.8
            } 120 Z`}
            fill="#14532D"
            opacity={0.85}
          />
          <Path
            d={`M${width * 0.75} 120 L ${width * 0.9} 12 L ${
              width * 1.05
            } 120 Z`}
            fill="#14532D"
            opacity={0.85}
          />

          {/* Foreground Trees - brightest, catching sunlight */}
          <Path
            d={`M${width * 0.05} 120 L ${width * 0.2} 28 L ${
              width * 0.35
            } 120 Z`}
            fill="#15803D"
            opacity={0.9}
          />
          <Path
            d={`M${width * 0.4} 120 L ${width * 0.55} 22 L ${
              width * 0.7
            } 120 Z`}
            fill="#16A34A"
            opacity={0.9}
          />
          <Path
            d={`M${width * 0.65} 120 L ${width * 0.8} 25 L ${
              width * 0.95
            } 120 Z`}
            fill="#15803D"
            opacity={0.9}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Behind buttons and UI elements
  },
  skyBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#60A5FA", // Bright blue sky (blue-400)
  },
  sunContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 1, // Background layer
  },
  forestContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2, // In front of sun
  },
});

export default SunshineOverlay;
