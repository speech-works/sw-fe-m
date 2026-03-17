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
  interpolate,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  SvgProps,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface ReadingFaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

export const ReadingFace: React.FC<ReadingFaceProps> = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
  style,
  ...props
}) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const blink = useSharedValue(1);
  const cycleProgress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      // Blink animation (4s cycle)
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 2000,
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );

      // Main cycle animation (5s cycle for everything else)
      cycleProgress.value = withRepeat(
        withTiming(1, { duration: 5000 }),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      cycleProgress.value = 0;
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(cycleProgress);
    };
  }, [shouldAnimate]);

  // Derived values for animations based on cycleProgress (0 to 1)
  const phoneY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [25, 25, 0, 0, 25, 25]);
  });
  const phoneRotation = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [-8, -8, -4, -4, -8, -8]);
  });
  const phoneOpacity = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [0, 0, 1, 1, 0, 0]);
  });

  const glassesY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [0, 0, 3, 3, 0, 0]);
  });

  const leftBrowRotation = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [0, 0, 12, 12, 0, 0]);
  });
  const leftBrowY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [0, 0, 2, 2, 0, 0]);
  });

  const rightBrowRotation = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [0, 0, -8, -8, 0, 0]);
  });
  const rightBrowY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [0, 0, -2, -2, 0, 0]);
  });

  const pupilX = useDerivedValue(() => {
    return interpolate(
      cycleProgress.value,
      [0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1],
      [0, 0, -2.5, -2.5, 1, 1, -2, -2, 0, 0],
    );
  });
  const pupilY = useDerivedValue(() => {
    return interpolate(
      cycleProgress.value,
      [0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1],
      [0, 0, 2.5, 2.5, 3, 3, 2.5, 2.5, 0, 0],
    );
  });

  const mouthScaleX = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.25, 0.75, 0.85, 1], [1, 1, 0.5, 0.5, 1, 1]);
  });

  // Animated Props
  const phoneProps = useAnimatedProps(() => ({
    opacity: phoneOpacity.value,
    transform: [
      { translateX: 14 },
      { translateY: 40 },
      { translateY: phoneY.value },
      { rotate: `${phoneRotation.value}deg` },
      { translateX: -14 },
      { translateY: -40 },
    ] as any,
  }));

  const glassesProps = useAnimatedProps(() => ({
    transform: [{ translateY: glassesY.value }] as any,
  }));

  const leftBrowProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 15 },
      { translateY: 17 }, // Updated from 18
      { rotate: `${leftBrowRotation.value}deg` },
      { translateY: leftBrowY.value },
      { translateX: -15 },
      { translateY: -17 },
    ] as any,
  }));

  const rightBrowProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 33 },
      { translateY: 17 }, // Updated from 18
      { rotate: `${rightBrowRotation.value}deg` },
      { translateY: rightBrowY.value },
      { translateX: -33 },
      { translateY: -17 },
    ] as any,
  }));

  const pupilProps = useAnimatedProps(() => ({
    transform: [
      { translateX: pupilX.value },
      { translateY: pupilY.value },
    ] as any,
  }));

  const blinkProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 23 },
      { scaleY: blink.value },
      { translateX: -24 },
      { translateY: -23 },
    ] as any,
  }));

  const mouthProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 34 },
      { scaleX: mouthScaleX.value },
      { translateX: -24 },
      { translateY: -34 },
    ] as any,
  }));

  return (
    <View
      style={[
        {
          width: activeWidth as any,
          height: activeHeight as any,
          borderRadius: (Number(activeWidth) || 48) / 2,
          overflow: "hidden",
          position: "relative",
        },
        style as any,
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 48 48"
        fill="none"
        {...props}
      >
        <Defs>
          <ClipPath id="eyeball-clip">
            <Circle cx="15" cy="23" r="5" /> {/* Updated from 3.5 */}
            <Circle cx="33" cy="23" r="5" /> {/* Updated from 3.5 */}
          </ClipPath>
        </Defs>

        {/* Background Circle */}
        {!transparentBg && (
          <Path
            fill="#E2E8F0"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        )}

        {/* Face Shadow */}
        <Path
          fill="black"
          opacity={0.25}
          transform="translate(1, 1)"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* Face Base */}
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* Eyebrows */}
        <AnimatedG animatedProps={leftBrowProps}>
          <Path
            d="M 11 17 L 19 17" // Updated from 18, 18
            stroke="#111215"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rightBrowProps}>
          <Path
            d="M 29 17 L 37 17" // Updated from 18, 18
            stroke="#111215"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </AnimatedG>

        {/* Eyes & Pupils */}
        <AnimatedG animatedProps={blinkProps}>
          <Circle
            cx="15"
            cy="23"
            r="5" // Updated from 3.5
            fill="#FFF"
            stroke="#111215"
            strokeWidth="1.5"
          />
          <Circle
            cx="33"
            cy="23"
            r="5" // Updated from 3.5
            fill="#FFF"
            stroke="#111215"
            strokeWidth="1.5"
          />

          <G clipPath="url(#eyeball-clip)">
            <AnimatedG animatedProps={pupilProps}>
              <Circle cx="15" cy="23" r="2.2" fill="#111215" /> {/* Updated from 1.5 */}
              <Circle cx="33" cy="23" r="2.2" fill="#111215" /> {/* Updated from 1.5 */}
            </AnimatedG>
          </G>
        </AnimatedG>

        {/* Reading Glasses */}
        <AnimatedG animatedProps={glassesProps}>
          <Path
            d="M 10 22 L 20 22 C 20 26.5, 18 28, 15 28 C 12 28, 10 26.5, 10 22 Z"
            fill="#DBEAFE" // Updated from #FFF
            fillOpacity={0.4}
            stroke="#93C5FD" // Updated from #FFFFFF
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path
            d="M 28 22 L 38 22 C 38 26.5, 36 28, 33 28 C 30 28, 28 26.5, 28 22 Z"
            fill="#DBEAFE" // Updated from #FFF
            fillOpacity={0.4}
            stroke="#93C5FD" // Updated from #FFFFFF
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Path
            d="M 20 22 Q 24 20, 28 22"
            stroke="#93C5FD" // Updated from #FFFFFF
            strokeWidth={1.5}
            fill="none"
          />
          <Path
            d="M 10 22 L 4 19"
            stroke="#93C5FD" // Updated from #FFFFFF
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 38 22 L 44 19"
            stroke="#93C5FD" // Updated from #FFFFFF
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* Mouth */}
        <AnimatedG animatedProps={mouthProps}>
          <Path
            d="M 20 34 Q 24 34.5, 28 34"
            stroke="#111215"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* Phone Prop */}
        <AnimatedG animatedProps={phoneProps}>
          <Rect
            x="6"
            y="25"
            width="16"
            height="28"
            fill="#F8FAFC"
            stroke="#111215"
            strokeWidth={1.5}
            rx="3"
          />
          <Rect
            x="7.5"
            y="26.5"
            width="7"
            height="7"
            fill="#E2E8F0"
            stroke="#111215"
            strokeWidth={1}
            rx="2"
          />
          <Circle cx="9.5" cy="28.5" r="1.1" fill="#0F172A" />
          <Circle cx="9.5" cy="31.5" r="1.1" fill="#0F172A" />
          <Circle cx="12.5" cy="30" r="1.1" fill="#0F172A" />
          <Circle
            cx="12.5"
            cy="27.8"
            r="0.5"
            fill="#FFFFFF"
            stroke="#111215"
            strokeWidth={0.5}
          />
          <Circle cx="12.5" cy="32.2" r="0.4" fill="#64748B" />
        </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(ReadingFace);
