import React, { useEffect } from "react";
import Svg, {
  ClipPath,
  Path,
  G,
  Defs,
  SvgProps,
  Line,
  Circle,
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

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  inhaleDuration?: number;
  holdDuration?: number;
  exhaleDuration?: number;
  isHoldAfterExhale?: boolean;
  holdAfterExhaleDuration?: number;
}

const GuidedBreathingFace = ({
  size = 48,
  shouldAnimate = true,
  loop = true,
  repeatCount,
  inhaleDuration = 4000,
  holdDuration = 4000,
  exhaleDuration = 4000,
  isHoldAfterExhale = false,
  holdAfterExhaleDuration = 0,
  ...props
}: SvgIconProps) => {
  const activeWidth = size;
  const activeHeight = size;

  const scale = useSharedValue(1);
  const breathOpacity = useSharedValue(0);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(scale);
      cancelAnimation(breathOpacity);
      return;
    }

    const runAnimation = () => {
      // Scale Animation Sequence
      scale.value = withSequence(
        // Inhale: Scale up
        withTiming(1.15, {
          duration: inhaleDuration,
          easing: Easing.inOut(Easing.ease),
        }),
        // Hold: Stay scaled up
        withDelay(holdDuration, withTiming(1.15, { duration: 0 })),
        // Exhale: Scale down
        withTiming(1, {
          duration: exhaleDuration,
          easing: Easing.inOut(Easing.ease),
        }),
        // Optional Hold after Exhale
        withDelay(
          isHoldAfterExhale ? holdAfterExhaleDuration : 0,
          withTiming(1, { duration: 0 })
        )
      );

      // Breath Opacity Animation Sequence
      breathOpacity.value = withSequence(
        // Inhale: Invisible
        withTiming(0, { duration: inhaleDuration }),
        // Hold: Invisible
        withDelay(holdDuration, withTiming(0, { duration: 0 })),
        // Exhale: Visible
        withTiming(1, { duration: exhaleDuration * 0.2 }),
        withDelay(
          exhaleDuration * 0.6,
          withTiming(0, { duration: exhaleDuration * 0.2 })
        ),
        // Optional Hold after Exhale: Invisible
        withDelay(
          isHoldAfterExhale ? holdAfterExhaleDuration : 0,
          withTiming(0, { duration: 0 })
        )
      );
    };

    if (loop) {
      scale.value = withRepeat(
        withSequence(
          // Inhale: Scale up
          withTiming(1.15, {
            duration: inhaleDuration,
            easing: Easing.inOut(Easing.ease),
          }),
          // Hold: Stay scaled up
          withDelay(holdDuration, withTiming(1.15, { duration: 0 })),
          // Exhale: Scale down
          withTiming(1, {
            duration: exhaleDuration,
            easing: Easing.inOut(Easing.ease),
          }),
          // Optional Hold after Exhale
          withDelay(
            isHoldAfterExhale ? holdAfterExhaleDuration : 0,
            withTiming(1, { duration: 0 })
          )
        ),
        -1, // Infinite repeat
        false // Do not reverse
      );

      breathOpacity.value = withRepeat(
        withSequence(
          // Inhale: Invisible
          withTiming(0, { duration: inhaleDuration }),
          // Hold: Invisible
          withDelay(holdDuration, withTiming(0, { duration: 0 })),
          // Exhale: Fade in quickly, stay, then fade out
          withTiming(1, { duration: exhaleDuration * 0.2 }),
          withDelay(
            exhaleDuration * 0.6,
            withTiming(0, { duration: exhaleDuration * 0.2 })
          ),
          // Optional Hold after Exhale: Invisible
          withDelay(
            isHoldAfterExhale ? holdAfterExhaleDuration : 0,
            withTiming(0, { duration: 0 })
          )
        ),
        -1,
        false
      );
    } else {
      runAnimation();
    }
  }, [
    shouldAnimate,
    loop,
    inhaleDuration,
    holdDuration,
    exhaleDuration,
    holdAfterExhaleDuration,
    isHoldAfterExhale,
  ]);

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

        {/* Mouth (Soft, slightly open 'O' for exhaling) - Bolder Color */}
        <Circle cx="24" cy="34" r="2.5" fill="#000000" />

        {/* Breath Visual: Wispy, dissipating elements - Animated Opacity */}
        <AnimatedG animatedProps={animatedBreathProps}>
          <Line
            x1="20"
            y1="31"
            x2="18"
            y2="28"
            stroke="#3E2723"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Line
            x1="28"
            y1="31"
            x2="30"
            y2="28"
            stroke="#3E2723"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Line
            x1="24"
            y1="30"
            x2="24"
            y2="27"
            stroke="#3E2723"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </AnimatedG>
      </AnimatedG>
    </Svg>
  );
};
export default React.memo(GuidedBreathingFace);
