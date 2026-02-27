import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Mask,
  Path,
  Pattern,
  Rect,
  Stop,
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
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
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

    // Tear Animation (Faster Heave) - Using snappier easing
    tearLevel.value = withRepeat(
      withSequence(
        withTiming(0.5, {
          duration: 1500,
          easing: Easing.bezier(0.33, 1, 0.68, 1),
        }),
        withTiming(1, {
          duration: 1500,
          easing: Easing.bezier(0.33, 1, 0.68, 1),
        }),
      ),
      -1,
      true,
    );

    // Blue Funk Pulse (Background Aura)
    pulse.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.out(Easing.sin) }),
      -1,
      false,
    );

    // Rain Animation (Stormy) - Optimized timing
    rain.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.linear }),
      -1,
      false,
    );

    // Mouth Quiver (Intermittent shivering)
    mouthQuiver.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2000 }),
        withTiming(1, { duration: 40 }),
        withTiming(-1, { duration: 40 }),
        withTiming(1, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      ),
      -1,
      true,
    );
  }, [shouldAnimate]);

  const faceProps = useAnimatedProps(() => ({
    transform: [{ translateY: droopY.value }, { scaleY: scaleY.value }] as any,
    originY: 24,
  }));

  const rainProps = useAnimatedProps(() => ({
    transform: [{ translateY: rain.value * 20 }] as any,
  }));

  const mouthProps = useAnimatedProps(() => ({
    transform: [{ translateX: mouthQuiver.value * 0.5 }] as any,
    originX: 24,
    originY: 39,
  }));

  const leftTearProps = useAnimatedProps(() => ({
    transform: [{ translateY: 12 - 4 * tearLevel.value }] as any,
    opacity: 0.9 * tearLevel.value,
  }));

  const rightTearProps = useAnimatedProps(() => ({
    transform: [{ translateY: 12 - 4 * tearLevel.value }] as any,
    opacity: 0.9 * tearLevel.value,
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
        <Defs>
          <LinearGradient id="tearGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#81D4FA" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#0288D1" stopOpacity="1" />
          </LinearGradient>
          <Mask id="leftEyeMask">
            <Circle cx="16.8" cy="24" r="7.2" fill="white" />
          </Mask>
          <Mask id="rightEyeMask">
            <Circle cx="31.2" cy="24" r="7.2" fill="white" />
          </Mask>
          <Pattern
            id="rainPattern"
            x="0"
            y="0"
            width="12"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M 6 4 V 10"
              stroke="#000000"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.2"
            />
          </Pattern>
        </Defs>

        <G>
          <Path
            fill="#E6E8FF"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />

          {/* Rain (Optimized Pattern) */}
          <AnimatedRect
            x="0"
            y="-20"
            width="48"
            height="88"
            fill="url(#rainPattern)"
            animatedProps={rainProps}
          />

          {/* Animated Sad Face */}
          <AnimatedG animatedProps={faceProps}>
            <G>
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

            {/* Left Eye Tear (Masked) */}
            <G mask="url(#leftEyeMask)">
              <AnimatedG animatedProps={leftTearProps}>
                <Circle cx="16.8" cy="28" r="8" fill="url(#tearGradient)" />
                {/* Glint */}
                <Circle cx="15" cy="25" r="1.2" fill="white" opacity="0.4" />
              </AnimatedG>
            </G>

            {/* Right Eye Tear (Masked) */}
            <G mask="url(#rightEyeMask)">
              <AnimatedG animatedProps={rightTearProps}>
                <Circle cx="31.2" cy="28" r="8" fill="url(#tearGradient)" />
                {/* Glint */}
                <Circle cx="29.4" cy="25" r="1.2" fill="white" opacity="0.4" />
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
    </View>
  );
};

export default SadFace;
