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
  SvgProps,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface SearchingFaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

export const SearchingFace: React.FC<SearchingFaceProps> = ({
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
  const browProgress = useSharedValue(0);

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

      // Main cycle animation (5s cycle for search movement and eye zoom)
      cycleProgress.value = withRepeat(
        withTiming(1, { duration: 5000 }),
        -1,
        false,
      );

      // Brow twitch animation (3s cycle)
      browProgress.value = withRepeat(
        withTiming(1, { duration: 3000 }),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      cycleProgress.value = 0;
      browProgress.value = 0;
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(cycleProgress);
      cancelAnimation(browProgress);
    };
  }, [shouldAnimate]);

  // Derived values for animations
  const searchX = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.3, 0.6, 1], [0, -3, 1, 0]);
  });
  const searchY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.3, 0.6, 1], [0, 1, -2, 0]);
  });
  const searchRotation = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.3, 0.6, 1], [0, -3, 3, 0]);
  });

  const eyeZoom = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.3, 0.6, 1], [1.4, 1.55, 1.35, 1.4]);
  });

  const browY = useDerivedValue(() => {
    return interpolate(browProgress.value, [0, 0.5, 1], [0, -1, 0]);
  });
  const browRotation = useDerivedValue(() => {
    return interpolate(browProgress.value, [0, 0.5, 1], [0, -1, 0]);
  });

  // Animated Props
  const searchProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 32 },
      { translateY: 23 },
      { translateX: searchX.value },
      { translateY: searchY.value },
      { rotate: `${searchRotation.value}deg` },
      { translateX: -32 },
      { translateY: -23 },
    ] as any,
  }));

  const zoomProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 32 },
      { translateY: 23 },
      { scale: eyeZoom.value },
      { translateX: -32 },
      { translateY: -23 },
    ] as any,
  }));

  const browProps = useAnimatedProps(() => ({
    transform: [{ translateY: browY.value }, { rotate: `${browRotation.value}deg` }] as any,
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
          <ClipPath id="eye-right-clip">
            <Circle cx="32" cy="23" r="6" />
          </ClipPath>
        </Defs>

        {/* Background Circle */}
        {!transparentBg && (
          <Path
            fill="#475569"
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
        <AnimatedG animatedProps={browProps}>
          <Path
            d="M 11 18 Q 15 16, 19 18"
            stroke="#111215"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 29 17 Q 33 14, 37 16"
            stroke="#111215"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* Left Eye */}
        <AnimatedG animatedProps={blinkProps}>
          <Circle
            cx="16"
            cy="24"
            r="4"
            fill="#FFF"
            stroke="#111215"
            strokeWidth="1.5"
          />
          <Circle cx="16.5" cy="24" r="2" fill="#111215" />
          <Circle cx="17.2" cy="23.2" r="0.8" fill="#FFF" />
        </AnimatedG>

        {/* Right Eye (Magnified) */}
        <AnimatedG animatedProps={blinkProps}>
          <Circle
            cx="32"
            cy="23"
            r="6"
            fill="#FFF"
            stroke="#111215"
            strokeWidth="1.5"
          />
          <G clipPath="url(#eye-right-clip)">
            <AnimatedG animatedProps={zoomProps}>
              <Circle cx="32" cy="23" r="3" fill="#111215" />
              <Circle cx="33.2" cy="21.8" r="1.2" fill="#FFF" />
            </AnimatedG>
          </G>
        </AnimatedG>

        {/* Mouth */}
        <Path
          d="M 21 35 Q 24 34, 27 35"
          stroke="#111215"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Magnifying Glass */}
        <AnimatedG animatedProps={searchProps}>
          <Path
            d="M 41 34 L 46 41"
            stroke="#543829"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Circle
            cx="32"
            cy="23"
            r="8.5"
            stroke="#CBD5E1"
            strokeWidth="2.5"
            fill="#93C5FD"
            fillOpacity={0.2}
          />
          <Path
            d="M 27 19 Q 29 17, 32 17"
            stroke="#FFF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.5}
          />
        </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(SearchingFace);
