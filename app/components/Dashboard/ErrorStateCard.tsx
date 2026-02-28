import React, { useEffect } from "react";
import {
  Dimensions,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse, Path } from "react-native-svg";

export type ErrorStateVariant = "light" | "dark";

export interface ErrorStateCardProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  variant?: ErrorStateVariant;
  style?: StyleProp<ViewStyle>;
}

const windowWidth = Dimensions.get("window").width;

const TornPaperSVG = ({ variant }: { variant: ErrorStateVariant }) => {
  const isDark = variant === "dark";
  const strokeColor = isDark ? "#FDA4AF" : "#F67A7A";
  const shadowColor = isDark
    ? "rgba(225, 29, 72, 0.4)"
    : "rgba(246, 122, 122, 0.25)";

  return (
    <Svg width="120" height="130" viewBox="0 0 100 100">
      <Ellipse cx="50" cy="92" rx="28" ry="4" fill={shadowColor} />

      {/* Upside Down Crashed Plane SVG Path */}
      {/* Front right wing (large) */}
      <Path
        d="M 50,75 L 75,25 L 45,65 Z"
        fill={isDark ? "rgba(253, 164, 175, 0.05)" : "#FFFFFF"}
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Front left wing (large) */}
      <Path
        d="M 50,75 L 25,25 L 45,65 Z"
        fill={isDark ? "rgba(255, 255, 255, 0.02)" : "#FDFDFD"}
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Left Back tail wing fold */}
      <Path
        d="M 25,25 L 35,15 L 45,65"
        fill={isDark ? "rgba(253, 164, 175, 0.15)" : "#FFEBF0"}
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Right Back tail wing fold */}
      <Path
        d="M 75,25 L 65,15 L 45,65"
        fill={isDark ? "rgba(253, 164, 175, 0.1)" : "#FFF5F7"}
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Center Crease */}
      <Path
        d="M 45,65 L 50,75"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Crushed Tip Effect at the bottom (Nose of plane hitting ground) */}
      <Path
        d="M 45,70 L 41,75 L 48,82 L 53,75 L 49,70 Z"
        fill={isDark ? "rgba(253, 164, 175, 0.05)" : "#FFFFFF"}
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const ErrorStateCard: React.FC<ErrorStateCardProps> = ({
  title = "Uh oh.",
  message = "Something weird happened.\nKeep calm and try again.",
  onRetry,
  variant = "light",
  style,
}) => {
  const isDark = variant === "dark";

  // -- Colors --
  // Light Theme (Illustration based)
  const lightCardBg = "#FFFFFF";
  const lightCurveBg = "#FFEBF0"; // Matches image top curve
  const lightTitleColor = "#2A3C46"; // Dark Slate
  const lightMessageColor = "#5F7B8C"; // Medium Slate
  const lightButtonBg = "#F87171"; // Reddish Pink

  // Dark Theme (Matches user's request for premium Dark Red theme)
  const darkCardBg = "#1A050B";
  const darkCurveBg = "#4C0519";
  const darkTitleColor = "#FFFFFF";
  const darkMessageColor = "rgba(255, 255, 255, 0.7)";
  const darkButtonBg = "#E11D48";

  const cardBg = isDark ? darkCardBg : lightCardBg;
  const curveBg = isDark ? darkCurveBg : lightCurveBg;
  const titleColor = isDark ? darkTitleColor : lightTitleColor;
  const messageColor = isDark ? darkMessageColor : lightMessageColor;
  const buttonBg = isDark ? darkButtonBg : lightButtonBg;

  // -- Dark Theme Background Animations --
  const floatAnim = useSharedValue(0);
  useEffect(() => {
    if (isDark) {
      floatAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [isDark]);

  const orbStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnim.value * 10 },
      { translateX: floatAnim.value * 8 },
    ],
  }));

  const orbStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnim.value * -15 },
      { translateX: floatAnim.value * -10 },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: cardBg }, style]}>
      {/* 
        To recreate the precise curved background from the image:
        The curve is bowing UPWARDS in the center. This means the top part is flat Pink,
        and the bottom part is a White circle that overlaps the Pink.
      */}

      {/* 1. Flat Header Base */}
      <View style={[styles.headerBg, { backgroundColor: curveBg }]}>
        {isDark && (
          <View style={StyleSheet.absoluteFill}>
            <Animated.View
              style={[
                styles.orb,
                {
                  backgroundColor: "rgba(225, 29, 72, 0.2)",
                  top: -20,
                  left: -20,
                },
                orbStyle1,
              ]}
            />
            <Animated.View
              style={[
                styles.orb,
                {
                  backgroundColor: "rgba(159, 18, 57, 0.3)",
                  bottom: -20,
                  right: -10,
                },
                orbStyle2,
              ]}
            />
          </View>
        )}
      </View>

      {/* 2. The Overlapping Convex Hill Background */}
      <View style={[styles.hillShape, { backgroundColor: cardBg }]} />

      {/* 3. Foreground Content */}
      <View style={styles.content}>
        {/* Torn Paper Graphic positioned exactly halfway */}
        <View style={styles.iconContainer}>
          <TornPaperSVG variant={variant} />
        </View>

        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>

        <Text style={[styles.message, { color: messageColor }]}>{message}</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRetry}
          style={[
            styles.button,
            { backgroundColor: buttonBg, shadowColor: buttonBg },
          ]}
        >
          <Text style={styles.buttonText}>TRY AGAIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    position: "relative",
  },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180, // Height of the flat curve back
    overflow: "hidden",
  },
  hillShape: {
    position: "absolute",
    top: 140, // Drops down to give the header 140px space, then curves upwards
    left: "-50%", // Centers the massive circle
    width: "200%", // Massive width for subtle convex curve
    height: 600,
    borderRadius: 1000,
  },
  content: {
    padding: 30,
    alignItems: "center",
    zIndex: 1, // On top of backgrounds
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 20,
    height: 130,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 35,
    paddingHorizontal: 10,
    fontWeight: "400",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  orb: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
  },
});

export default React.memo(ErrorStateCard);
