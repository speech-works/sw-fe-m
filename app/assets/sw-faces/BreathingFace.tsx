import React, { useEffect } from "react";
import Svg, {
  Mask,
  Path,
  G,
  Defs,
  Filter,
  FeFlood,
  FeColorMatrix,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  FeBlend,
  SvgProps,
} from "react-native-svg";
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
          withTiming(1, { duration: 4000, easing: Easing.out(Easing.quad) }), // Slow Exhale (4s)
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.quad) }) // Slow Inhale (4s)
        ),
        loop ? -1 : repeatCount,
        false
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
      ],
    };
  });

  const eyeProps = useAnimatedProps(() => ({
    // Subtle up/down float (Slower due to longer duration)
    transform: [{ translateY: -1 + Math.sin(progress.value * Math.PI) * 1.0 }],
  }));

  return (
    <Svg
      width={activeWidth}
      height={activeHeight}
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <Defs>
        <Filter
          id="spirit_shadow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          filterUnits="userSpaceOnUse"
        >
          <FeFlood floodOpacity={0} result="BackgroundImageFix" />
          <FeColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <FeOffset dx={4} dy={4} />
          <FeGaussianBlur stdDeviation={1} />
          <FeComposite in2="hardAlpha" operator="out" />
          <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <FeBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </Filter>
        <Mask
          id="spirit_mask"
          x="0"
          y="0"
          width="48"
          height="48"
          maskUnits="userSpaceOnUse"
        >
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </Mask>
      </Defs>

      {/* --- PASTE INNER CONTENT HERE --- */}
      <G mask="url(#spirit_mask)">
        {/* Background - Calm Blue 200 */}
        <Path
          fill="#BFC2FF"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#spirit_shadow)">
          <Path
            fill="#FFDABF"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Closed Peaceful Eyes (Animated) */}
        <AnimatedG animatedProps={eyeProps}>
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
  );
};
export default BreathingFace;
