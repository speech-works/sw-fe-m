import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  transparentBg?: boolean;
}

const ConfusedFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  loop = true,
  repeatCount = 1,
  transparentBg = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const blink = useSharedValue(1);
  const scratchProgress = useSharedValue(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (shouldAnimate) {
      timeout = setTimeout(() => {
        // Eye blinking animation
        blink.value = withRepeat(
          withSequence(
            withDelay(
              Math.random() * 2000 + 3000,
              withTiming(0.1, { duration: 120 }),
            ),
            withTiming(1, { duration: 120 }),
          ),
          -1,
          false,
        );

        // Head scratching arm animation
        scratchProgress.value = withRepeat(
          withSequence(
            withDelay(1500, withTiming(1, { duration: 120 })),
            withTiming(-1, { duration: 120 }),
            withTiming(1, { duration: 120 }),
            withTiming(-1, { duration: 120 }),
            withTiming(0, { duration: 120 }),
          ),
          loop ? -1 : repeatCount,
          false,
        );
      }, 400); // delay to prevent UI thread deadlock during transition
    } else {
      blink.value = 1;
      scratchProgress.value = 0;
    }

    return () => {
      clearTimeout(timeout);
      cancelAnimation(blink);
      cancelAnimation(scratchProgress);
    };
  }, [shouldAnimate, loop, repeatCount]);

  // Derived values for the animations
  const blinkScale = useDerivedValue(() => blink.value);
  const armRotation = useDerivedValue(() => scratchProgress.value * 5); // 5 degrees pivot
  const linesOpacity = useDerivedValue(() => Math.abs(scratchProgress.value));

  // Animated Props mapping
  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkScale.value }] as any,
    originY: 24, // Pivot point for eyes
  }));

  const armProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 42 },
      { translateY: 48 },
      { rotate: `${armRotation.value}deg` },
      { translateX: -42 },
      { translateY: -48 },
    ] as any,
  }));

  const motionLineProps = useAnimatedProps(() => ({
    opacity: linesOpacity.value,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (Number(activeWidth) || 48) / 2,
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
        {/* Background Circle */}
        {!transparentBg && (
          <Path
            fill="#EAE2FF" // Soft pale purple backing
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        )}

        {/* Face Shadow - Strict Brand Path */}
        <Path
          fill="black"
          opacity={0.25}
          transform="translate(1, 1)"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* Face Base - Strict Brand Path */}
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* Confused Eyebrows */}
        <Path
          d="M 13 18 L 19 20"
          stroke="#111215"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 29 19 L 35 17"
          stroke="#111215"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Asymmetrical Eyes */}
        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="16" cy="24" r="3.5" fill="#111215" />
          <Circle cx="32" cy="23" r="2.5" fill="#111215" />
        </AnimatedG>

        {/* Crooked/Confused Mouth */}
        <Path
          d="M 20 34 Q 24 32, 28 34 L 30 35"
          stroke="#111215"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Scratching Arm & Fingers */}
        <AnimatedG animatedProps={armProps}>
          {/* Main Arm */}
          <Path
            d="M 42 48 Q 44 28, 32 10"
            stroke="#E6A883" // Slightly darker skin tone for visual layering
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          {/* Fingers rubbing head */}
          <Path
            d="M 32 10 Q 28 8, 25 12"
            stroke="#E6A883"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 34 11 Q 30 9, 27 14"
            stroke="#E6A883"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 36 12 Q 32 10, 29 16"
            stroke="#E6A883"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* Action/Motion Lines for the scratching */}
        <AnimatedG animatedProps={motionLineProps}>
          <Path
            d="M 18 8 L 21 4"
            stroke="#111215"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M 25 6 L 28 2"
            stroke="#111215"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(ConfusedFace);
