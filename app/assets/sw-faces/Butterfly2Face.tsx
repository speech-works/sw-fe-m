import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
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
  Path,
  Line,
  LinearGradient,
  Stop,
  SvgProps,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const FACE_PATH =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";

const INK_COLOR = "#0F172A";

export interface FaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
  skinColor?: string;
  inkColor?: string;
  butterflyColor?: string;
}

/**
 * THE MONARCH (Butterfly2Face)
 * Concept: A serene face with atmospheric floating pollen.
 * A butterfly flaps its wings realistically and follows a flight path, eventually landing perfectly on the nose.
 */
export const Butterfly2Face: React.FC<FaceProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  skinColor = "#FFFFFF",
  inkColor = INK_COLOR,
  butterflyColor = "#F97316",
  style,
  ...props
}) => {
  const cycleProgress = useSharedValue(0); // 8s flight cycle
  const breathe = useSharedValue(0); // 2s up-and-down breathing cycle
  const flap = useSharedValue(1); // Fast wing flap cycle
  const pollen1 = useSharedValue(0);
  const pollen2 = useSharedValue(0);
  const pollen3 = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      // Butterfly flight path
      cycleProgress.value = withRepeat(
        withTiming(1, {
          duration: 8000,
          easing: Easing.bezier(0.45, 0, 0.55, 1),
        }),
        -1,
        false,
      );

      // Face breathing up and down
      breathe.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );

      // Wing flap (scaleX 1 -> 0.1 -> 1)
      flap.value = withRepeat(
        withTiming(0.1, { duration: 150, easing: Easing.linear }),
        -1,
        true,
      );

      // Atmospheric pollen drifting upwards
      pollen1.value = withRepeat(
        withTiming(1, { duration: 4000, easing: Easing.linear }),
        -1,
        false,
      );
      pollen2.value = withDelay(
        1500,
        withRepeat(
          withTiming(1, { duration: 5000, easing: Easing.linear }),
          -1,
          false,
        ),
      );
      pollen3.value = withDelay(
        700,
        withRepeat(
          withTiming(1, { duration: 3500, easing: Easing.linear }),
          -1,
          false,
        ),
      );
    } else {
      cycleProgress.value = 0;
      breathe.value = 0;
      flap.value = 1;
      pollen1.value = 0;
      pollen2.value = 0;
      pollen3.value = 0;
    }

    return () => {
      cancelAnimation(cycleProgress);
      cancelAnimation(breathe);
      cancelAnimation(flap);
      cancelAnimation(pollen1);
      cancelAnimation(pollen2);
      cancelAnimation(pollen3);
    };
  }, [shouldAnimate]);

  // Derived Butterfly Flight Props
  const flyProps = useAnimatedProps(() => {
    // Flight waypoints mimicking natural butterfly movement
    const x = interpolate(
      cycleProgress.value,
      [0, 0.25, 0.5, 0.75, 0.9, 1],
      [20, -10, 5, 0, 0, 20],
    );
    const y = interpolate(
      cycleProgress.value,
      [0, 0.25, 0.5, 0.75, 0.9, 1],
      [-10, 5, 20, 12, 12, -10],
    );
    const rot = interpolate(
      cycleProgress.value,
      [0, 0.25, 0.5, 0.75, 0.9, 1],
      [-20, 20, -40, 0, 0, -20],
    );

    return {
      transform: [
        { translateX: 24 + x },
        { translateY: 14 + y },
        { rotate: `${rot}deg` },
      ] as any,
    };
  });

  // Wing Flapping Props (Anchored accurately to the body)
  const wingProps = useAnimatedProps(() => ({
    transform: [
      { translateY: 3 },
      { scaleX: flap.value },
      { translateY: -3 },
    ] as any,
  }));

  // Face Breathing Props
  const faceProps = useAnimatedProps(() => ({
    transform: [
      { translateY: interpolate(breathe.value, [0, 1], [0, -1]) },
    ] as any,
  }));

  // Pollen Props Maker
  const makePollenProps = (sv: Animated.SharedValue<number>) =>
    useAnimatedProps(() => ({
      transform: [
        { translateY: interpolate(sv.value, [0, 1], [10, -20]) },
      ] as any,
      opacity: interpolate(sv.value, [0, 0.5, 1], [0, 0.6, 0]),
    }));

  const p1Props = makePollenProps(pollen1);
  const p2Props = makePollenProps(pollen2);
  const p3Props = makePollenProps(pollen3);

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
          <ClipPath id="clip-monarch-face">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
          <LinearGradient id="bg-monarch" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FEF3C7" />
            <Stop offset="100%" stopColor="#FDE68A" />
          </LinearGradient>
        </Defs>

        <G clipPath={transparentBg ? undefined : "url(#clip-monarch-face)"}>
          {/* Background */}
          {!transparentBg && (
            <Circle cx="24" cy="24" r="24" fill="url(#bg-monarch)" />
          )}

          {/* Atmospheric Pollen */}
          <AnimatedCircle
            cx="10"
            cy="30"
            r="1"
            fill="#F59E0B"
            animatedProps={p1Props}
          />
          <AnimatedCircle
            cx="38"
            cy="40"
            r="1.5"
            fill="#F59E0B"
            animatedProps={p2Props}
          />
          <AnimatedCircle
            cx="24"
            cy="45"
            r="1"
            fill="#F59E0B"
            animatedProps={p3Props}
          />

          {/* Character Group (Breathes up and down) */}
          <AnimatedG animatedProps={faceProps}>
            <Path d={FACE_PATH} fill={skinColor} />

            {/* Serene Squinting Eyes */}
            <Path
              d="M 13 25 Q 16 23 19 25"
              stroke={inkColor}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 29 25 Q 32 23 35 25"
              stroke={inkColor}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Calm Smile */}
            <Path
              d="M 21 34 Q 24 36 27 34"
              stroke={inkColor}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* The Monarch Butterfly (Animated relative to the face) */}
            <AnimatedG animatedProps={flyProps}>
              {/* Left Wing */}
              <AnimatedPath
                d="M 0 3 C -6 -6, -10 2, 0 7 Z"
                fill={butterflyColor}
                stroke="#431407"
                strokeWidth="0.5"
                animatedProps={wingProps}
              />
              {/* Right Wing */}
              <AnimatedPath
                d="M 0 3 C 6 -6, 10 2, 0 7 Z"
                fill={butterflyColor}
                stroke="#431407"
                strokeWidth="0.5"
                animatedProps={wingProps}
              />
              {/* Butterfly Body */}
              <Line
                x1="0"
                y1="-1"
                x2="0"
                y2="7"
                stroke="#431407"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </AnimatedG>
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(Butterfly2Face);
