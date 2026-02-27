import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { G, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const HappyFace = ({
  size = 48,
  width,
  height,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const eyeScaleY = useSharedValue(1);
  const bounceY = useSharedValue(0);
  const wiggleRotate = useSharedValue(0);
  const starTwinkle = useSharedValue(0);

  React.useEffect(() => {
    if (!shouldAnimate) {
      eyeScaleY.value = withTiming(1);
      bounceY.value = withTiming(0);
      wiggleRotate.value = withTiming(0);
      starTwinkle.value = withTiming(0);
      return;
    }

    // 1. Blink Animation (Random interval)
    const blinkDuration = Math.random() * 2000 + 3000;
    eyeScaleY.value = withRepeat(
      withSequence(
        withDelay(blinkDuration, withTiming(0.1, { duration: 150 })),
        withTiming(1, { duration: 150 }),
      ),
      -1,
      false,
    );

    // 2. Happy Bounce (Rhythmic up/down)
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      true,
    );

    // 3. Wiggle (Joyful head tilt side to side)
    wiggleRotate.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // 4. Twinkling Stars (Pulse)
    starTwinkle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [shouldAnimate]);

  // Pivot around Y=24 roughly for eyes
  const eyeAnimatedProps = useAnimatedProps(() => ({
    transform: [
      { translateY: 24 },
      { scaleY: eyeScaleY.value },
      { translateY: -24 },
    ],
  }));

  // Face Bounce & Wiggle
  const faceAnimatedProps = useAnimatedProps(() => ({
    transform: [
      { translateY: bounceY.value },
      { rotate: `${wiggleRotate.value}deg` },
    ],
    originX: 24,
    originY: 24,
  }));

  const starProps = useAnimatedProps(() => ({
    opacity: 0.5 + 0.5 * starTwinkle.value,
    transform: [{ scale: 0.8 + 0.4 * starTwinkle.value }],
    originX: 24,
    originY: 40,
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
        <G>
          <Path
            fill="#F9E7D9"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          {/* Animated Face Group (Bounce + Wiggle) */}
          <AnimatedG animatedProps={faceAnimatedProps}>
            <G>
              <Path
                fill="#F7DFA9"
                d="M7.538 10.313c0-2.766 33.199-2.766 33.199 0 2.766 0 2.766 60 0 60 0 2.767-33.2 2.767-33.2 0-2.766 0-2.766-60 0-60"
              />
            </G>

            {/* Animated Eyes Group */}
            <AnimatedG animatedProps={eyeAnimatedProps}>
              {/* Left Eye */}
              <Path
                fill="#fff"
                d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
              />
              {/* Right Eye */}
              <Path
                fill="#fff"
                d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
              />
              {/* Pupils */}
              <Path
                fill="#2E2E2E"
                d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
              />
            </AnimatedG>

            {/* Open Mouth Smile with Teeth (Position Tweaked) */}
            <G>
              {/* Mouth Interior (Dark) */}
              <Path
                fill="#5C4033"
                d="M15 36 Q24 37 33 36 Q33 44 24 44 Q15 44 15 36 Z"
              />
              {/* Teeth (White) */}
              <Path
                fill="#FFFFFF"
                d="M15 36 Q24 37 33 36 L32.5 39 Q24 40 15.5 39 Z"
              />
              {/* Mouth Outline */}
              <Path
                stroke="#3E2723"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                d="M15 36 Q24 37 33 36 Q33 44 24 44 Q15 44 15 36 Z"
              />
            </G>
          </AnimatedG>

          {/* Twinkling Stars (Bottom Props) */}
          <AnimatedG animatedProps={starProps}>
            {/* Left Star */}
            <Path
              fill="#FFD700"
              d="M 12 40 L 13 42 L 15 42 L 13.5 43.5 L 14 45.5 L 12 44 L 10 45.5 L 10.5 43.5 L 9 42 L 11 42 Z"
            />
            {/* Right Star */}
            <Path
              fill="#FFD700"
              d="M 36 40 L 37 42 L 39 42 L 37.5 43.5 L 38 45.5 L 36 44 L 34 45.5 L 34.5 43.5 L 33 42 L 35 42 Z"
            />
            {/* Center Small Star */}
            <Path
              fill="#FFFACD"
              d="M 24 42 L 24.5 43 L 25.5 43 L 24.8 43.8 L 25 44.8 L 24 44 L 23 44.8 L 23.2 43.8 L 22.5 43 L 23.5 43 Z"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default HappyFace;
