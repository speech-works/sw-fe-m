import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
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
  const cycleProgress = useSharedValue(0);
  const flap = useSharedValue(1);
  const breezeX = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      // 1. Blinking
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 2000,
            withTiming(0.1, { duration: 120 })
          ),
          withTiming(1, { duration: 120 })
        ),
        -1,
        false
      );

      // 2. Main Flight/Expression Cycle
      cycleProgress.value = withRepeat(
        withTiming(1, {
          duration: 3000,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      // 3. Wing Flap
      flap.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 100 }),
          withTiming(1, { duration: 100 })
        ),
        -1,
        true
      );

      // 4. Breeze Movement
      breezeX.value = withRepeat(
        withTiming(40, { duration: 2500, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      blink.value = 1;
      cycleProgress.value = 0;
      flap.value = 1;
      breezeX.value = 0;
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(cycleProgress);
      cancelAnimation(flap);
      cancelAnimation(breezeX);
    };
  }, [shouldAnimate]);

  // --- Animation Props ---

  // Butterfly movement: Sine bobbing + dynamic tilt
  const butterflyProps = useAnimatedProps(() => {
    const p = cycleProgress.value;
    const x = interpolate(p, [0, 1], [-35, 35]);
    const baseWaitY = interpolate(p, [0, 0.5, 1], [-15, -5, -15]);
    const bobbing = Math.sin(p * Math.PI * 6) * 3;
    const y = baseWaitY + bobbing;
    const r = interpolate(p, [0, 1], [-15, 15]) + Math.cos(p * Math.PI * 6) * 12;

    return {
      transform: [
        { translateX: 24 + x },
        { translateY: 24 + y },
        { rotate: `${r}deg` },
      ] as any,
      opacity: 1,
    };
  });

  const wingProps = useAnimatedProps(() => ({
    transform: [
      { translateY: 3 },
      { scaleX: flap.value },
      { translateY: -3 },
    ] as any,
  }));

  const pupilProps = useAnimatedProps(() => {
    const p = cycleProgress.value;
    const targetX = interpolate(p, [0, 1], [-35, 35]);
    const targetY = interpolate(p, [0, 0.5, 1], [-15, -5, -15]);

    return {
      transform: [
        { translateX: interpolate(targetX, [-35, 35], [-2.5, 2.5]) },
        { translateY: interpolate(targetY, [-15, 0], [-1.2, 1.2]) },
      ] as any,
    };
  });

  const blinkProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 24 },
      { scaleY: blink.value },
      { translateX: -24 },
      { translateY: -24 },
    ] as any,
  }));

  const breezeProps = useAnimatedProps(() => ({
    transform: [{ translateX: -20 + breezeX.value }] as any,
    opacity: interpolate(cycleProgress.value, [0, 0.5, 1], [0, 0.5, 0]),
  }));

  // Magnifying Glass search movement
  const searchProps = useAnimatedProps(() => {
    const p = cycleProgress.value;
    const sx = interpolate(p, [0, 0.3, 0.6, 1], [0, -3, 1, 0]);
    const sy = interpolate(p, [0, 0.3, 0.6, 1], [0, 1, -2, 0]);
    const sr = interpolate(p, [0, 0.3, 0.6, 1], [0, -3, 3, 0]);

    return {
      transform: [
        { translateX: 32 },
        { translateY: 24 },
        { translateX: sx },
        { translateY: sy },
        { rotate: `${sr}deg` },
        { translateX: -32 },
        { translateY: -24 },
      ] as any,
    };
  });

  const zoomProps = useAnimatedProps(() => {
    const scale = interpolate(cycleProgress.value, [0, 0.3, 0.6, 1], [1.4, 1.55, 1.35, 1.4]);
    return {
      transform: [
        { translateX: 32 },
        { translateY: 24 },
        { scale },
        { translateX: -32 },
        { translateY: -24 },
      ] as any,
    };
  });

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

          {/* Breeze lines */}
          <AnimatedLine
            x1="0"
            y1="12"
            x2="16"
            y2="12"
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeLinecap="round"
            animatedProps={breezeProps}
          />

          <Path d={FACE_PATH} fill={skinColor} />

          {/* Eyes */}
          <AnimatedG animatedProps={blinkProps}>
            <Circle cx="16" cy="24" r="4.5" fill="#FFF" stroke={inkColor} strokeWidth="2" />
            <AnimatedG animatedProps={pupilProps}>
              <Circle cx="16" cy="24" r="2" fill={inkColor} />
            </AnimatedG>
          </AnimatedG>

          <AnimatedG animatedProps={blinkProps}>
            <Circle cx="32" cy="24" r="6.5" fill="#FFF" stroke={inkColor} strokeWidth="1.5" />
            <G clipPath="url(#eye-right-clip)">
              <AnimatedG animatedProps={zoomProps}>
                <AnimatedG animatedProps={pupilProps}>
                  <Circle cx="32" cy="24" r="3.5" fill={inkColor} />
                  <Circle cx="33.2" cy="22.8" r="1.2" fill="#FFF" />
                </AnimatedG>
              </AnimatedG>
            </G>
          </AnimatedG>

          {/* Mouth: "O" shape in awe */}
          <Circle
            cx="24"
            cy="36"
            r="2.5"
            fill="none"
            stroke={inkColor}
            strokeWidth="2"
          />

          {/* Magnifying Glass Overlay */}
          <AnimatedG animatedProps={searchProps}>
            <Path d="M 41 35 L 46 42" stroke="#543829" strokeWidth="4" strokeLinecap="round" />
            <Circle cx="32" cy="24" r="8.5" stroke="#CBD5E1" strokeWidth="2.5" fill="#93C5FD" fillOpacity={0.2} />
            <Path d="M 27 20 Q 29 18, 32 18" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity={0.5} />
          </AnimatedG>
        </G>

        {/* Butterfly mascot - Layered on top */}
        <AnimatedG animatedProps={butterflyProps}>
          <AnimatedPath
            d="M 0 3 C -6 -6, -10 2, 0 7 Z"
            fill="#FF6B00"
            stroke={inkColor}
            strokeWidth="0.8"
            animatedProps={wingProps}
          />
          <AnimatedPath
            d="M 0 3 C 6 -6, 10 2, 0 7 Z"
            fill="#FF6B00"
            stroke={inkColor}
            strokeWidth="0.8"
            animatedProps={wingProps}
          />
          <Line x1="0" y1="0" x2="0" y2="7" stroke={inkColor} strokeWidth="1.2" strokeLinecap="round" />
        </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(VoidFace);
