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
  Path,
  SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

const FACE_PATH =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";
const SKIN_COLOR = "#FFDABF";
const INK_COLOR = "#111215";

export interface FaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

export const FireflyFace: React.FC<FaceProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  style,
  ...props
}) => {
  const blink = useSharedValue(1);
  const cycleProgress = useSharedValue(0); // 5s cycle for firefly movement
  const flutter = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(Math.random() * 2000 + 2000, withTiming(0.1, { duration: 120 })),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false
      );

      cycleProgress.value = withRepeat(
        withTiming(1, { duration: 5000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        -1,
        false
      );

      flutter.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 50 }),
          withTiming(1, { duration: 50 }),
        ),
        -1,
        false
      );
    } else {
      blink.value = 1;
      cycleProgress.value = 0;
      flutter.value = 1;
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(cycleProgress);
      cancelAnimation(flutter);
    };
  }, [shouldAnimate]);

  // Firefly path calculations
  const flyX = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.25, 0.5, 0.75, 1], [-5, 12, 24, 36, 53]);
  });
  const flyY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.25, 0.5, 0.75, 1], [20, 8, 14, 8, 20]);
  });
  const flyOpacity = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  });

  const eyeTrackX = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.25, 0.5, 0.75, 1], [-3, -2, 0, 3, 3]);
  });
  const eyeTrackY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.25, 0.5, 0.75, 1], [2, -3, -1, -3, 2]);
  });

  const flyProps = useAnimatedProps(() => ({
    transform: [
      { translateX: flyX.value },
      { translateY: flyY.value },
    ] as any,
    opacity: flyOpacity.value,
  }));

  const flutterProps = useAnimatedProps(() => ({
    transform: [{ scaleX: flutter.value }] as any,
  }));

  const pupilProps = useAnimatedProps(() => ({
    transform: [
      { translateX: eyeTrackX.value },
      { translateY: eyeTrackY.value },
    ] as any,
  }));

  const blinkProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 24 },
      { scaleY: blink.value },
      { translateX: -24 },
      { translateY: -24 },
    ] as any,
  }));

  return (
    <View
      style={[
        {
          width: size as any,
          height: size as any,
          borderRadius: (Number(size) || 100) / 2,
          overflow: "hidden",
        },
        style as any,
      ]}
    >
      <Svg
        viewBox="0 0 48 48"
        width="100%"
        height="100%"
        fill="none"
        {...props}
      >
        <Defs>
          <ClipPath id="clip-firefly">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
        </Defs>
        {!transparentBg && (
          <Circle cx="24" cy="24" r="24" fill="#ECFCCB" />
        )}

          {/* Faint flight trail */}
          <Path
            d="M -5 20 Q 12 0 24 14 T 53 20"
            fill="none"
            stroke="#D9F99D"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          <Path d={FACE_PATH} fill={SKIN_COLOR} />

          {/* Eyes tracking the erratic path */}
          <AnimatedG animatedProps={blinkProps}>
            <Circle
              cx="16"
              cy="24"
              r="4.5"
              fill="#FFF"
              stroke={INK_COLOR}
              strokeWidth="2"
            />
            <Circle
              cx="32"
              cy="24"
              r="4.5"
              fill="#FFF"
              stroke={INK_COLOR}
              strokeWidth="2"
            />

            <AnimatedG animatedProps={pupilProps}>
              <Circle cx="16" cy="24" r="2" fill={INK_COLOR} />
              <Circle cx="32" cy="24" r="2" fill={INK_COLOR} />
            </AnimatedG>
          </AnimatedG>

          <Path
            d="M 21 34 Q 24 35 27 34"
            fill="none"
            stroke={INK_COLOR}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Firefly Prop */}
          <AnimatedG animatedProps={flyProps}>
            <AnimatedG animatedProps={flutterProps}>
              <Path d="M 0 0 L -4 -3 L -1 2 Z" fill="#84CC16" />
              <Path d="M 0 0 L 4 -3 L 1 2 Z" fill="#84CC16" />
            </AnimatedG>
            <Circle
              cx="0"
              cy="1"
              r="1.5"
              fill="#BEF264"
            />
          </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(FireflyFace);
