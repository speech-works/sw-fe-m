import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { G, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const BreathingFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 3500,
            easing: Easing.bezier(0.33, 1, 0.68, 1),
          }), // Snappier Exhale
          withTiming(0, {
            duration: 3500,
            easing: Easing.bezier(0.33, 1, 0.68, 1),
          }), // Snappier Inhale
        ),
        loop ? -1 : repeatCount,
        false,
      );
    } else {
      progress.value = withTiming(0);
    }
  }, [shouldAnimate, loop, repeatCount]);

  const breathProps = useAnimatedProps(() => {
    // Spiral Out: Grow from mouth (approx 26, 34)
    const scale = 0.2 + 0.8 * progress.value; // 0.2 -> 1.0
    const rotate = progress.value * 20; // 0 -> 20deg spin
    return {
      opacity: 0.8 * (1 - progress.value), // Fade out
      transform: [
        { translateX: 26 },
        { translateY: 34 }, // Pivot
        { scale },
        { rotate: `${rotate}deg` },
        { translateX: -26 },
        { translateY: -34 }, // Unpivot
      ] as any,
    };
  });

  const eyeProps = useAnimatedProps(() => ({
    // Subtle up/down float (Slower due to longer duration)
    transform: [
      { translateY: -1 + Math.sin(progress.value * Math.PI) * 1.0 },
    ] as any,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (typeof activeWidth === "number" ? activeWidth : 48) / 2,
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
        {/* --- PASTE INNER CONTENT HERE --- */}
        <G>
          {/* Background - Calm Blue 200 */}
          <Path
            fill="#BFC2FF"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          {/* Shadow - Vector approximation for performance */}
          <Path
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            fill="black"
            opacity={0.25}
            transform="translate(4, 4)"
          />

          {/* Face Shape */}
          <Path
            fill="#FFDABF"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />

          {/* Closed Peaceful Eyes (Animated) */}
          <AnimatedG animatedProps={eyeProps}>
            <View>
              {/* Note: View here is just to wrap, but AnimatedG is the one that transforms */}
            </View>
            <Path
              stroke="#000340"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M14 24 Q 18 26, 22 24"
              fill="none"
            />
            <Path
              stroke="#000340"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M26 24 Q 30 26, 34 24"
              fill="none"
            />
          </AnimatedG>

          {/* Relaxed Mouth */}
          <Path
            stroke="#000340"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M22 34 Q 24 35, 26 34"
            fill="none"
          />

          {/* Breath Swirls (Wind/Prana) */}
          <AnimatedPath
            stroke="#4047FF"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            d="M30 34 C 34 32, 36 36, 34 38"
            animatedProps={breathProps}
          />
          <AnimatedPath
            stroke="#4047FF"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            d="M32 36 C 36 34, 40 38, 38 42"
            animatedProps={breathProps}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(BreathingFace);
