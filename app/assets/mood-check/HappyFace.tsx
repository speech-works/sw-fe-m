import * as React from "react";
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

  React.useEffect(() => {
    if (!shouldAnimate) {
      eyeScaleY.value = withTiming(1);
      bounceY.value = withTiming(0);
      wiggleRotate.value = withTiming(0);
      return;
    }

    // 1. Blink Animation (Random interval)
    const blinkDuration = Math.random() * 2000 + 3000;
    eyeScaleY.value = withRepeat(
      withSequence(
        withDelay(blinkDuration, withTiming(0.1, { duration: 150 })),
        withTiming(1, { duration: 150 })
      ),
      -1,
      false
    );

    // 2. Happy Bounce (Rhythmic up/down)
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
      ),
      -1,
      true // Reverse not needed for simple bounce sequence, but true makes it yoyo if we just did one move. Sequence does up/down.
    );

    // 3. Wiggle (Joyful head tilt side to side)
    wiggleRotate.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
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
          id="face_shadow_filter"
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
          id="circle_mask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="48"
          height="48"
        >
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </Mask>
      </Defs>

      <G mask="url(#circle_mask)">
        <Path
          fill="#F9E7D9"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* Animated Face Group (Bounce + Wiggle) */}
        <AnimatedG animatedProps={faceAnimatedProps}>
          <G filter="url(#face_shadow_filter)">
            <Path
              fill="#F7DFA9"
              d="M7.538 10.313c0-2.766 33.199-2.766 33.199 0 2.766 0 2.766 38.736 0 38.736 0 2.767-33.2 2.767-33.2 0-2.766 0-2.766-38.736 0-38.736"
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

          <Path
            stroke="#4A4A4A"
            strokeLinecap="round"
            strokeWidth={3.558}
            d="M16.8 36q7.2 4.8 14.4 0"
          />
        </AnimatedG>
      </G>
    </Svg>
  );
};

export default HappyFace;
