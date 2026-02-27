import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { theme } from "../../../Theme/tokens";

const { width, height } = Dimensions.get("window");

const LoginBackground = () => {
  // Animation values (0 to 1) for floating effect
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startFloat = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true, // we can use native driver with transform
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    };

    startFloat(floatAnim1, 6000);
    startFloat(floatAnim2, 7000);
    startFloat(floatAnim3, 8000);
  }, []);

  // Interpolate 0-1 to X/Y offsets
  const getOrbStyle = (
    anim: Animated.Value,
    baseX: number,
    baseY: number,
    rangeX: number,
    rangeY: number
  ) => {
    return {
      transform: [
        { translateX: baseX },
        { translateY: baseY },
        {
          translateX: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, rangeX],
          }),
        },
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, rangeY],
          }),
        },
      ],
    };
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base Gradient */}
      <LinearGradient
        colors={["#FFF7ED", "#FFFFFF", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Orb 1: Top Left - Warm Peach */}
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: theme.colors.library.orange[200],
            width: 300,
            height: 300,
            opacity: 0.6,
            ...getOrbStyle(floatAnim1, -50, -50, 30, 40),
          },
        ]}
      />

      {/* Orb 2: Middle Right - Soft Red/Pink */}
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: theme.colors.library.red[200],
            width: 250,
            height: 250,
            borderRadius: 125,
            opacity: 0.4,
            ...getOrbStyle(floatAnim2, width - 150, height / 2, -40, 20),
          },
        ]}
      />

      {/* Orb 3: Bottom Left - Subtle Orange */}
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: theme.colors.library.orange[100],
            width: 350,
            height: 350,
            borderRadius: 175,
            opacity: 0.5,
            ...getOrbStyle(floatAnim3, -50, height - 200, 20, -30),
          },
        ]}
      />

      {/* Glass Overlay to smooth everything out */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(255,255,255,0.3)" },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
    // Add heavy blur to "mesh" them together
    // Note: 'blurRadius' prop exists on Image, but for View we rely on abstract layout or opacity.
    // React Native doesn't support CSS 'filter: blur()' natively on Views without libraries like Expo BlurView (which blurs content BEHIND).
    // To achieve the blurred blob look, strictly native views usually use high opacity and overlapping,
    // or we can use images. For now, pure shapes with low opacity work well for the clean "Academy" aesthetic.
  },
});

export default LoginBackground;
