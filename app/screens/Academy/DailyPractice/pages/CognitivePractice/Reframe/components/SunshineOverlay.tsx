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
  const treeShimmer = useSharedValue(0.7);

  useEffect(() => {
    // Pulsing sun glow effect - gentle breathing
    sunGlow.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) })
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
      opacity: 0.95,
    };
  });

  const treeStyle = useAnimatedStyle(() => {
    return {
      opacity: treeShimmer.value,
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Bright Sun - positioned like in community face */}
      <Animated.View style={[styles.sunContainer, sunStyle]}>
        <Svg width={70} height={70} viewBox="0 0 70 70">
          <Defs>
            <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FEF08A" stopOpacity="1" />
              <Stop offset="30%" stopColor="#FDE047" stopOpacity="0.95" />
              <Stop offset="60%" stopColor="#FACC15" stopOpacity="0.7" />
              <Stop offset="85%" stopColor="#EAB308" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#CA8A04" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="35" cy="35" r="30" fill="url(#sunGlow)" />
        </Svg>
      </Animated.View>

      {/* Dense Forest - matching community face style */}
      <Animated.View style={[styles.forestContainer, treeStyle]}>
        <Svg
          width={width}
          height={80}
          viewBox={`0 0 ${width} 80`}
          preserveAspectRatio="none"
        >
          {/* Dense Tall Trees - Back Layer (Darkest) - scaled to full width */}
          <Path
            d={`M${-width * 0.1} 80 L ${width * 0.05} 15 L ${width * 0.2} 80 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.1} 80 L ${width * 0.25} 10 L ${width * 0.4} 80 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.35} 80 L ${width * 0.5} 18 L ${width * 0.65} 80 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.6} 80 L ${width * 0.75} 12 L ${width * 0.9} 80 Z`}
            fill="#064E3B"
          />
          <Path
            d={`M${width * 0.85} 80 L ${width * 1.0} 16 L ${width * 1.15} 80 Z`}
            fill="#064E3B"
          />

          {/* Mid Layer Trees - lighter green */}
          <Path
            d={`M${0} 80 L ${width * 0.15} 28 L ${width * 0.3} 80 Z`}
            fill="#14532D"
            opacity={0.85}
          />
          <Path
            d={`M${width * 0.25} 80 L ${width * 0.4} 24 L ${width * 0.55} 80 Z`}
            fill="#14532D"
            opacity={0.85}
          />
          <Path
            d={`M${width * 0.5} 80 L ${width * 0.65} 26 L ${width * 0.8} 80 Z`}
            fill="#14532D"
            opacity={0.85}
          />
          <Path
            d={`M${width * 0.75} 80 L ${width * 0.9} 22 L ${width * 1.05} 80 Z`}
            fill="#14532D"
            opacity={0.85}
          />

          {/* Foreground Trees - brightest, catching sunlight */}
          <Path
            d={`M${width * 0.05} 80 L ${width * 0.2} 38 L ${width * 0.35} 80 Z`}
            fill="#15803D"
            opacity={0.9}
          />
          <Path
            d={`M${width * 0.4} 80 L ${width * 0.55} 32 L ${width * 0.7} 80 Z`}
            fill="#16A34A"
            opacity={0.9}
          />
          <Path
            d={`M${width * 0.65} 80 L ${width * 0.8} 35 L ${width * 0.95} 80 Z`}
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
    zIndex: 1,
  },
  sunContainer: {
    position: "absolute",
    top: 5,
    right: 10,
  },
  forestContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default SunshineOverlay;
