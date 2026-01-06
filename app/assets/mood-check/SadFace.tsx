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
  Circle,
  ClipPath,
  LinearGradient,
  Stop,
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

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const SadFace = ({
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

  const droopY = useSharedValue(0);
  const scaleY = useSharedValue(1);
  const tearLevel = useSharedValue(0); // 0 to 1 (filling up)
  const mouthQuiver = useSharedValue(0);
  const pulse = useSharedValue(0);
  const rain = useSharedValue(0);
  React.useEffect(() => {
    if (!shouldAnimate) {
      droopY.value = withTiming(0);
      scaleY.value = withTiming(1);
      tearLevel.value = withTiming(0);
      mouthQuiver.value = withTiming(0);
      return;
    }

    // FACE IS STATIC NOW (As requested)
    droopY.value = withTiming(0);
    scaleY.value = withTiming(1);

    // Tear Animation (Very Slow Heave)
    tearLevel.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Blue Funk Pulse (Background Aura)
    pulse.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.out(Easing.sin) }),
      -1,
      false
    );

    // Rain Animation (Stormy)
    rain.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );

    // Mouth Quiver (Intermittent shivering)
    mouthQuiver.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2000 }), // Wait
        withTiming(1, { duration: 50 }), // Shake R
        withTiming(-1, { duration: 50 }), // Shake L
        withTiming(1, { duration: 50 }), // Shake R
        withTiming(0, { duration: 50 }) // Stop
      ),
      -1,
      true
    );
  }, [shouldAnimate]);

  const faceProps = useAnimatedProps(() => ({
    transform: [{ translateY: droopY.value }, { scaleY: scaleY.value }],
    originY: 24, // Pivot from center
  }));

  const pulseProps = useAnimatedProps(() => ({
    transform: [{ scale: 1 + 0.4 * pulse.value }],
    opacity: 0.3 * (1 - pulse.value), // Fade out
    originX: 24,
    originY: 24,
  }));

  const rain1Props = useAnimatedProps(() => ({
    transform: [{ translateY: (rain.value % 1) * 70 }, { rotate: "-15deg" }],
    opacity: 0.3 * (1 - (rain.value % 1)),
  }));

  const rain2Props = useAnimatedProps(() => ({
    transform: [
      { translateY: ((rain.value + 0.5) % 1) * 70 },
      { rotate: "-15deg" },
    ],
    opacity: 0.3 * (1 - ((rain.value + 0.5) % 1)),
  }));

  const rain3Props = useAnimatedProps(() => ({
    transform: [
      { translateY: ((rain.value + 0.15) % 1) * 70 },
      { rotate: "-15deg" },
    ],
    opacity: 0.3 * (1 - ((rain.value + 0.15) % 1)),
  }));

  const rain4Props = useAnimatedProps(() => ({
    transform: [
      { translateY: ((rain.value + 0.7) % 1) * 70 },
      { rotate: "-15deg" },
    ],
    opacity: 0.3 * (1 - ((rain.value + 0.7) % 1)),
  }));

  const rain5Props = useAnimatedProps(() => ({
    transform: [
      { translateY: ((rain.value + 0.35) % 1) * 70 },
      { rotate: "-15deg" },
    ],
    opacity: 0.3 * (1 - ((rain.value + 0.35) % 1)),
  }));

  const rain6Props = useAnimatedProps(() => ({
    transform: [
      { translateY: ((rain.value + 0.85) % 1) * 70 },
      { rotate: "-15deg" },
    ],
    opacity: 0.3 * (1 - ((rain.value + 0.85) % 1)),
  }));

  const rain7Props = useAnimatedProps(() => ({
    transform: [
      { translateY: ((rain.value + 0.25) % 1) * 70 },
      { rotate: "-15deg" },
    ],
    opacity: 0.3 * (1 - ((rain.value + 0.25) % 1)),
  }));

  const rain8Props = useAnimatedProps(() => ({
    transform: [
      { translateY: ((rain.value + 0.6) % 1) * 70 },
      { rotate: "-15deg" },
    ],
    opacity: 0.3 * (1 - ((rain.value + 0.6) % 1)),
  }));

  const mouthProps = useAnimatedProps(() => ({
    transform: [{ translateX: mouthQuiver.value * 0.5 }], // Subtle shake
    originX: 24,
    originY: 39,
  }));

  const leftTearProps = useAnimatedProps(() => ({
    // Subtle wobble at the bottom
    transform: [{ translateY: -1 - 2 * tearLevel.value }],
    opacity: 0.8,
  }));

  const rightTearProps = useAnimatedProps(() => ({
    transform: [{ translateY: -1 - 2 * tearLevel.value }],
    opacity: 0.8,
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
        <Filter id="blue_blur" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation="4" />
        </Filter>
        <Filter
          id="sad_shadow"
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
          id="sad_mask"
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
        <ClipPath id="left_eye_clip">
          <Path d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4" />
        </ClipPath>
        <ClipPath id="right_eye_clip">
          <Path d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4" />
        </ClipPath>
        <LinearGradient id="tearGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#81D4FA" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#0288D1" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <G mask="url(#sad_mask)">
        <Path
          fill="#E6E8FF"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* Rain (Stormy Black Drizzle) */}
        <AnimatedG animatedProps={rain1Props}>
          <Path
            d="M 8 -10 V 5"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rain2Props}>
          <Path
            d="M 14 -15 V 2"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rain3Props}>
          <Path
            d="M 19 -8 V 7"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rain4Props}>
          <Path
            d="M 25 -12 V 4"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rain5Props}>
          <Path
            d="M 31 -6 V 8"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rain6Props}>
          <Path
            d="M 36 -14 V 1"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rain7Props}>
          <Path
            d="M 42 -9 V 6"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rain8Props}>
          <Path
            d="M 22 -18 V -2"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.2"
          />
        </AnimatedG>

        {/* Animated Sad Face */}
        <AnimatedG animatedProps={faceProps}>
          <G filter="url(#sad_shadow)">
            <Path
              fill="#BEEDE8"
              d="M7.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.199 2.766-33.199 0-2.767 0-2.767-38.736 0-38.736"
            />
          </G>
          {/* Eyes (White) */}
          <Path
            fill="#FAFBFC"
            d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
          />
          <Path
            fill="#FAFBFC"
            d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
          />

          {/* Left Eye Tear (Clipped Liquid + Glint) - Smaller */}
          <G clipPath="url(#left_eye_clip)">
            <AnimatedG animatedProps={leftTearProps}>
              <Circle cx="16.8" cy="42" r="7" fill="url(#tearGradient)" />
              {/* Glint */}
              <Path
                d="M 15 37 Q 16 36 17 37"
                stroke="white"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.8"
              />
            </AnimatedG>
          </G>

          {/* Right Eye Tear (Clipped Liquid + Glint) - Smaller */}
          <G clipPath="url(#right_eye_clip)">
            <AnimatedG animatedProps={rightTearProps}>
              <Circle cx="31.2" cy="42" r="7" fill="url(#tearGradient)" />
              {/* Glint */}
              <Path
                d="M 29.4 37 Q 30.4 36 31.4 37"
                stroke="white"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.8"
              />
            </AnimatedG>
          </G>

          {/* Pupils (now on top of tears) */}
          <Path
            fill="#5B5B5B"
            d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
          />

          {/* Eyebrows */}
          <Path
            fill="#5B5B5B"
            d="M23.298 12.913 11.707 16.02l.994 3.71 11.591-3.107z"
          />
          <Path
            fill="#5B5B5B"
            d="m36.292 16.019-11.591-3.106-.994 3.71 11.591 3.105z"
          />

          {/* Pursed Mouth (Quivering) */}
          <AnimatedG animatedProps={mouthProps}>
            <Path
              d="M 22 39 Q 24 37 26 39"
              stroke="#5B5B5B"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </AnimatedG>
        </AnimatedG>
      </G>
    </Svg>
  );
};

export default SadFace;
