import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Line, Path, SvgProps } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const PulsingRing = ({ delay, size }: { delay: number; size: number }) => {
  const scale = useSharedValue(0.0);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(3, { duration: 4000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 4000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }, { translateY: -size * 0.3 }], // Offset to forehead (approx 30% up)
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          justifyContent: "center",
          alignItems: "center",
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: size as any,
          height: size as any,
          borderRadius: (size as any) / 2,
          borderWidth: 2,
          borderColor: "rgba(255, 255, 255, 0.5)", // White halo
          backgroundColor: "rgba(255, 255, 255, 0.1)", // Faint fill
        }}
      />
    </Animated.View>
  );
};

const MeditationFace = ({
  size = 48,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => {
  const activeWidth =
    typeof size === "number" ? size : parseInt(size as string, 10);
  const activeHeight = activeWidth;

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Background Pulsing Rings */}
      <PulsingRing delay={0} size={activeWidth} />
      <PulsingRing delay={1000} size={activeWidth} />
      <PulsingRing delay={2000} size={activeWidth} />
      <PulsingRing delay={3000} size={activeWidth} />

      <View
        style={{
          width: activeWidth as any,
          height: activeHeight as any,
          borderRadius:
            (typeof activeWidth === "number" ? activeWidth : 48) / 2,
          overflow: "hidden",
        }}
      >
        <Svg
          width={activeWidth}
          height={activeHeight}
          viewBox="0 0 48 48"
          fill="none"
          {...props}
        >
          <G>
            {/* Background - Deep Indigo */}
            <Path
              fill="#3F51B5"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
            {/* Face Shape - Skin Tone (a warm, light peach/beige) */}
            <G>
              <Path
                fill="#FFDAB9" // Changed to a more neutral skin tone
                d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
              />
            </G>

            {/* Eyes (Straight, fully closed lines) */}
            <Line
              stroke="#607D8B"
              strokeWidth="2.5"
              strokeLinecap="round"
              x1="15"
              y1="24"
              x2="21"
              y2="24"
            />
            <Line
              stroke="#607D8B"
              strokeWidth="2.5"
              strokeLinecap="round"
              x1="27"
              y1="24"
              x2="33"
              y2="24"
            />

            {/* Mouth (Flat, neutral line) */}
            <Line
              stroke="#607D8B"
              strokeWidth="2.5"
              strokeLinecap="round"
              x1="20"
              y1="34"
              x2="28"
              y2="34"
            />
          </G>
        </Svg>
      </View>
    </View>
  );
};
export default React.memo(MeditationFace);
