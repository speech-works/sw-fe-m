import React, { useEffect } from "react";
import Svg, {
  ClipPath,
  Path,
  G,
  Defs,
  SvgProps,
  Line,
  Circle,
  Ellipse,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedProps,
  withRepeat,
  Easing,
  cancelAnimation,
  withDelay,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export type BreathingPhase =
  | "idle"
  | "inhale"
  | "hold-in"
  | "exhale"
  | "hold-out";

interface SvgIconProps extends SvgProps {
  size?: number | string;
  phase?: BreathingPhase;
  shouldAnimate?: boolean;
}

const GuidedBreathingFace = ({
  size = 48,
  phase = "idle",
  shouldAnimate = true,
  ...props
}: SvgIconProps) => {
  const activeWidth = size;
  const activeHeight = size;

  // Scale fixed at 1 (disabled zoom)
  const scale = useSharedValue(1);
  const breathOpacity = useSharedValue(0);

  // Mouth dimensions
  const mouthRx = useSharedValue(2.0);
  const mouthRy = useSharedValue(2.0);

  const eyeTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!shouldAnimate) return;
    const DURATION = 500; // Standard transition duration

    switch (phase) {
      case "idle":
        mouthRx.value = withTiming(2.0, { duration: DURATION });
        mouthRy.value = withTiming(2.0, { duration: DURATION });
        eyeTranslateY.value = withTiming(0, { duration: DURATION });
        breathOpacity.value = withTiming(0, { duration: DURATION });
        break;

      case "inhale":
        // Mouth: Small Round (Pursed)
        mouthRx.value = withTiming(2.0, { duration: DURATION });
        mouthRy.value = withTiming(2.0, { duration: DURATION });
        // Eyes: Lift
        eyeTranslateY.value = withTiming(-1.5, {
          duration: DURATION,
          easing: Easing.out(Easing.quad),
        });
        // Breath: Invisible
        breathOpacity.value = withTiming(0, { duration: 200 });
        break;

      case "hold-in":
        // Mouth: Flat
        mouthRx.value = withTiming(3.0, { duration: DURATION });
        mouthRy.value = withTiming(0.5, { duration: DURATION });
        // Eyes: Stay Lifted
        eyeTranslateY.value = withTiming(-1.5, { duration: DURATION });
        // Breath: Invisible
        breathOpacity.value = withTiming(0, { duration: 200 });
        break;

      case "exhale":
        // Mouth: Big Open
        mouthRx.value = withTiming(3.5, { duration: DURATION });
        mouthRy.value = withTiming(3.5, { duration: DURATION });
        // Eyes: Relax
        eyeTranslateY.value = withTiming(0, {
          duration: DURATION,
          easing: Easing.inOut(Easing.ease),
        });
        // Breath: Visible (fade in then pulse/stay)
        breathOpacity.value = withSequence(
          withTiming(1, { duration: 300 })
          // Optional: visual pulse could go here, but static visible is fine for now
        );
        break;

      case "hold-out":
        // Mouth: Flat
        mouthRx.value = withTiming(3.0, { duration: DURATION });
        mouthRy.value = withTiming(0.5, { duration: DURATION });
        // Eyes: Stay Relaxed
        eyeTranslateY.value = withTiming(0, { duration: DURATION });
        // Breath: fade out
        breathOpacity.value = withTiming(0, { duration: 300 });
        break;
    }
  }, [phase]);

  const animatedGroupProps = useAnimatedProps(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedBreathProps = useAnimatedProps(() => {
    return {
      opacity: breathOpacity.value,
    };
  });

  const animatedMouthProps = useAnimatedProps(() => {
    return {
      rx: mouthRx.value,
      ry: mouthRy.value,
    };
  });

  const animatedEyesProps = useAnimatedProps(() => {
    return {
      transform: [{ translateY: eyeTranslateY.value }],
    };
  });

  return (
    <Svg
      width={activeWidth}
      height={activeHeight}
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <Defs>
        <ClipPath id="release_mask">
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </ClipPath>
      </Defs>

      {/* Main Face Group - Scaling animation applied here */}
      <AnimatedG
        clipPath="url(#release_mask)"
        origin="24, 24"
        animatedProps={animatedGroupProps}
      >
        {/* Background - HIGH CONTRAST DARK GREY */}
        <Path
          fill="#424242"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* Shadow - Vector approximation */}
        <Path
          fill="black"
          opacity={0.25}
          transform="translate(4, 4)"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        {/* Face Shape - Light Terracotta (skin tone) */}
        <Path
          fill="#FFCCBC"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* Eyes (Closed with a gentle upward curve of relief) - Bolder Stroke Color */}
        <AnimatedG animatedProps={animatedEyesProps}>
          <Path
            stroke="#000000" // Black
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M14 24 Q 18 23, 22 24"
            fill="none"
          />
          <Path
            stroke="#000000" // Black
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M26 24 Q 30 23, 34 24"
            fill="none"
          />
        </AnimatedG>

        {/* Mouth (Soft, slightly open 'O' for exhaling) - Bolder Color */}
        <AnimatedCircle
          cx="24"
          cy="34"
          animatedProps={animatedMouthProps}
          fill="#000000"
        />

        {/* Breath Visual: Stream of air blowing OUT (below mouth) */}
        <AnimatedG animatedProps={animatedBreathProps}>
          {/* Center Stream */}
          <Path
            d="M24 38 C 24 40, 24 43, 22 45"
            stroke="#90A4AE" // Light Blue-Grey for air
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left Stream */}
          <Path
            d="M21 38 C 20 40, 18 43, 16 44"
            stroke="#90A4AE"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right Stream */}
          <Path
            d="M27 38 C 28 40, 30 43, 32 44"
            stroke="#90A4AE"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>
      </AnimatedG>
    </Svg>
  );
};
export default React.memo(GuidedBreathingFace);
