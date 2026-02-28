import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

const { width } = Dimensions.get("window");

// Bird component - individual bird with wing flapping
interface BirdProps {
  delay: number;
  yPosition: number;
  duration: number;
}

const Bird: React.FC<BirdProps> = React.memo(
  ({ delay, yPosition, duration }) => {
    const translateX = useSharedValue(width + 50);
    const wingFlap = useSharedValue(0);

    useEffect(() => {
      // Fly from right to left
      translateX.value = withDelay(
        delay,
        withRepeat(
          withTiming(-100, {
            duration: duration,
            easing: Easing.linear,
          }),
          -1,
          false,
        ),
      );

      // Wing flapping animation
      wingFlap.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 250, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 250, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );

      return () => {
        cancelAnimation(translateX);
        cancelAnimation(wingFlap);
      };
    }, []);

    const birdStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
      };
    });

    const wingStyle = useAnimatedStyle(() => {
      // More subtle wing flapping
      return {
        transform: [{ scaleY: 0.85 + wingFlap.value * 0.15 }],
      };
    });

    return (
      <Animated.View
        renderToHardwareTextureAndroid={true}
        shouldRasterizeIOS={true}
        style={[
          {
            position: "absolute",
            top: yPosition,
            left: 0,
          },
          birdStyle,
        ]}
      >
        <Animated.View style={wingStyle}>
          <Svg width={12} height={8} viewBox="0 0 12 8">
            {/* Realistic bird silhouette with curved wings */}
            <Path
              d="M 6,2 Q 3,0 1,1 Q 2,3 6,3.5 Q 10,3 11,1 Q 9,0 6,2 Z"
              fill="#FFFFFF"
              opacity={0.9}
            />
            {/* Small body */}
            <Path
              d="M 5.5,3 L 6.5,3 L 6.5,4 L 5.5,4 Z"
              fill="#FFFFFF"
              opacity={0.9}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    );
  },
);

const SunshineOverlay: React.FC = React.memo(() => {
  const sunGlow = useSharedValue(1);
  const sunOpacity = useSharedValue(1);
  const sunRise = useSharedValue(100); // Start below visible area

  useEffect(() => {
    // Sun rises from bottom to final position over 3 seconds
    sunRise.value = withTiming(10, {
      duration: 3000,
      easing: Easing.out(Easing.cubic),
    });

    // After rise completes, start pulsing glow effect
    const timer = setTimeout(() => {
      // Pulsing sun glow effect - more pronounced breathing
      sunGlow.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );

      // Pulsing opacity for extra glow effect
      sunOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.85, {
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      );
    }, 3000); // Start glow after sunrise completes

    return () => {
      clearTimeout(timer);
      cancelAnimation(sunRise);
      cancelAnimation(sunGlow);
      cancelAnimation(sunOpacity);
    };
  }, []);

  const sunStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sunGlow.value }, { translateY: sunRise.value }],
      opacity: sunOpacity.value,
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Bright Blue Sky Background */}
      <View style={styles.skyBackground} />

      {/* Bright Sun - positioned at top-left, behind trees */}
      <Animated.View
        style={[styles.sunContainer, sunStyle]}
        renderToHardwareTextureAndroid={true}
        shouldRasterizeIOS={true}
      >
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
      <Animated.View
        style={styles.forestContainer}
        renderToHardwareTextureAndroid={true}
        shouldRasterizeIOS={true}
      >
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
          />
          <Path
            d={`M${width * 0.25} 120 L ${width * 0.4} 14 L ${
              width * 0.55
            } 120 Z`}
            fill="#14532D"
          />
          <Path
            d={`M${width * 0.5} 120 L ${width * 0.65} 16 L ${
              width * 0.8
            } 120 Z`}
            fill="#14532D"
          />
          <Path
            d={`M${width * 0.75} 120 L ${width * 0.9} 12 L ${
              width * 1.05
            } 120 Z`}
            fill="#14532D"
          />

          {/* Foreground Trees - brightest, catching sunlight */}
          <Path
            d={`M${width * 0.05} 120 L ${width * 0.2} 28 L ${
              width * 0.35
            } 120 Z`}
            fill="#15803D"
          />
          <Path
            d={`M${width * 0.4} 120 L ${width * 0.55} 22 L ${
              width * 0.7
            } 120 Z`}
            fill="#16A34A"
          />
          <Path
            d={`M${width * 0.65} 120 L ${width * 0.8} 25 L ${
              width * 0.95
            } 120 Z`}
            fill="#15803D"
          />
        </Svg>
      </Animated.View>

      {/* Flying Birds - Multiple flocks */}
      {/* Flock 1 - Top */}
      <Bird delay={0} yPosition={20} duration={15000} />
      <Bird delay={500} yPosition={25} duration={15500} />
      <Bird delay={1000} yPosition={18} duration={14800} />

      {/* Flock 2 - Middle */}
      <Bird delay={3000} yPosition={45} duration={16000} />
      <Bird delay={3500} yPosition={50} duration={16200} />
      <Bird delay={4000} yPosition={42} duration={15800} />
      <Bird delay={4500} yPosition={48} duration={16100} />

      {/* Flock 3 - Lower */}
      <Bird delay={7000} yPosition={70} duration={17000} />
      <Bird delay={7600} yPosition={75} duration={17200} />
      <Bird delay={8200} yPosition={68} duration={16800} />
    </View>
  );
});

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
