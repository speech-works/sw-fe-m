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
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Rect,
  SvgProps,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const FACE_PATH =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";
const SKIN_COLOR = "#FFDABF";
const INK_COLOR = "#111215";

export interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  transparentBg?: boolean;
  skinColor?: string;
  inkColor?: string;
}

export const VoidFace: React.FC<SvgIconProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  skinColor = SKIN_COLOR,
  inkColor = INK_COLOR,
  style,
  ...props
}) => {
  const blink = useSharedValue(1);
  const cycleProgress = useSharedValue(0); // 4s cycle for leaf and tracking
  const flap = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
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

      cycleProgress.value = withRepeat(
        withTiming(1, {
          duration: 4000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        -1,
        false,
      );

      flap.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 100 }),
          withTiming(1, { duration: 100 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      cycleProgress.value = 0;
      flap.value = 1;
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(cycleProgress);
      cancelAnimation(flap);
    };
  }, [shouldAnimate]);

  // Leaf path calculations
  const leafX = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.5, 1], [-10, 24, 58]);
  });
  const leafY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.5, 1], [15, 5, 15]);
  });
  const leafRotate = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.5, 1], [-45, 45, 135]);
  });
  const leafOpacity = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  });

  // Breeze calculations
  const breezeX1 = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 1], [-40, 40]);
  });
  const breezeOpacity1 = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.5, 1], [0, 0.5, 0]);
  });

  const butterflyProps = useAnimatedProps(() => ({
    transform: [
      { translateX: leafX.value },
      { translateY: leafY.value },
      { rotate: `${leafRotate.value}deg` },
    ] as any,
    opacity: leafOpacity.value,
  }));

  const flapProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 0 },
      { scaleX: flap.value },
      { translateX: 0 },
    ] as any,
  }));

  // Magnifying glass search movement (from SearchingFace)
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
    return interpolate(
      cycleProgress.value,
      [0, 0.3, 0.6, 1],
      [1.4, 1.55, 1.35, 1.4],
    );
  });

  const searchProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 32 },
      { translateY: 24 },
      { translateX: searchX.value },
      { translateY: searchY.value },
      { rotate: `${searchRotation.value}deg` },
      { translateX: -32 },
      { translateY: -24 },
    ] as any,
  }));

  const zoomProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 32 },
      { translateY: 24 },
      { scale: eyeZoom.value },
      { translateX: -32 },
      { translateY: -24 },
    ] as any,
  }));

  const pupilProps = useAnimatedProps(() => {
    return {
      transform: [
        { translateX: interpolate(cycleProgress.value, [0, 1], [-3, 3]) },
        {
          translateY: interpolate(cycleProgress.value, [0, 0.5, 1], [1, -1, 1]),
        },
      ] as any,
    };
  });

  const blinkProps = useAnimatedProps(() => {
    return {
      transform: [
        { translateX: 24 },
        { translateY: 24 },
        { scaleY: blink.value },
        { translateX: -24 },
        { translateY: -24 },
      ] as any,
    };
  });

  const breezeProps1 = useAnimatedProps(() => ({
    transform: [{ translateX: breezeX1.value }] as any,
    opacity: breezeOpacity1.value,
  }));

  return (
    <View
      style={[
        {
          width: size as any,
          height: size as any,
          borderRadius: (Number(size) || 100) / 2,
          ...(transparentBg ? {} : { overflow: "hidden" }),
        },
        style as any,
      ]}
    >
      <Svg
        viewBox="0 0 48 48"
        width="100%"
        height="100%"
        fill="none"
        {...({ overflow: transparentBg ? "visible" : "hidden" } as any)}
        {...props}
      >
        <Defs>
          <ClipPath id="clip-void">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
          <ClipPath id="eye-right-clip">
            <Circle cx="32" cy="24" r="6" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#clip-void)">
          {!transparentBg && <Circle cx="24" cy="24" r="24" fill="#F8FAFC" />}

          {/* Gentle breeze lines */}
          <AnimatedLine
            x1="0"
            y1="12"
            x2="16"
            y2="12"
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeLinecap="round"
            animatedProps={breezeProps1}
          />

          <Path d={FACE_PATH} fill={skinColor} />

          {/* Left Eye */}
          <AnimatedG animatedProps={blinkProps}>
            <Circle
              cx="16"
              cy="24"
              r="4.5"
              fill="#FFF"
              stroke={inkColor}
              strokeWidth="2"
            />
            <AnimatedG animatedProps={pupilProps}>
              <Circle cx="16" cy="24" r="2" fill={inkColor} />
            </AnimatedG>
          </AnimatedG>

          {/* Right Eye (Magnified like SearchingFace) */}
          <AnimatedG animatedProps={blinkProps}>
            <Circle
              cx="32"
              cy="24"
              r="6.5"
              fill="#FFF"
              stroke={inkColor}
              strokeWidth="1.5"
            />
            <G clipPath="url(#eye-right-clip)">
              <AnimatedG animatedProps={zoomProps}>
                <AnimatedG animatedProps={pupilProps}>
                  <Circle cx="32" cy="24" r="3.5" fill={inkColor} />
                  <Circle cx="33.2" cy="22.8" r="1.2" fill="#FFF" />
                </AnimatedG>
              </AnimatedG>
            </G>
          </AnimatedG>

          {/* Mouth */}
          <Path
            d="M 21 34 Q 24 33 27 34"
            fill="none"
            stroke={inkColor}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Magnifying Glass Overlay */}
          <AnimatedG animatedProps={searchProps}>
            <Path
              d="M 41 35 L 46 42"
              stroke="#543829"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Circle
              cx="32"
              cy="24"
              r="8.5"
              stroke="#CBD5E1"
              strokeWidth="2.5"
              fill="#93C5FD"
              fillOpacity={0.2}
            />
            <Path
              d="M 27 20 Q 29 18, 32 18"
              stroke="#FFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity={0.5}
            />
          </AnimatedG>

          {!transparentBg && (
            <AnimatedG animatedProps={butterflyProps}>
              {/* Left Wing */}
              <AnimatedPath
                d="M 0 0 C -6 -6, -10 2, 0 7 Z"
                fill="#FF9040"
                stroke={inkColor}
                strokeWidth="0.5"
                animatedProps={flapProps}
              />
              {/* Right Wing */}
              <AnimatedPath
                d="M 0 0 C 6 -6, 10 2, 0 7 Z"
                fill="#FF9040"
                stroke={inkColor}
                strokeWidth="0.5"
                animatedProps={flapProps}
              />
              {/* Butterfly Body */}
              <Line
                x1="0"
                y1="-1"
                x2="0"
                y2="7"
                stroke={inkColor}
                strokeWidth="1"
                strokeLinecap="round"
              />
            </AnimatedG>
          )}
        </G>

        {transparentBg && (
          <AnimatedG animatedProps={butterflyProps}>
            {/* Left Wing */}
            <AnimatedPath
              d="M 0 0 C -6 -6, -10 2, 0 7 Z"
              fill="#FF9040"
              stroke={inkColor}
              strokeWidth="0.5"
              animatedProps={flapProps}
            />
            {/* Right Wing */}
            <AnimatedPath
              d="M 0 0 C 6 -6, 10 2, 0 7 Z"
              fill="#FF9040"
              stroke={inkColor}
              strokeWidth="0.5"
              animatedProps={flapProps}
            />
            {/* Butterfly Body */}
            <Line
              x1="0"
              y1="-1"
              x2="0"
              y2="7"
              stroke={inkColor}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </AnimatedG>
        )}
      </Svg>
    </View>
  );
};

export default React.memo(VoidFace);
