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
  Rect,
  Line,
  SvgProps,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const FACE_PATH =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";

export interface FaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

export const SeveredConnectionFace: React.FC<FaceProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  style,
  ...props
}) => {
  const dangle = useSharedValue(0); // -5 to 5 degrees
  const sparkScale = useSharedValue(0.5);
  const sparkOpacity = useSharedValue(0);
  const wifiProgress = useSharedValue(0); // 0 to 1

  useEffect(() => {
    if (shouldAnimate) {
      dangle.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      sparkScale.value = withRepeat(
        withSequence(
          withDelay(1350, withTiming(1.2, { duration: 150 })),
          withTiming(0.5, { duration: 150 }),
          withDelay(1350, withTiming(1.2, { duration: 0 })), // Placeholder
        ),
        -1,
        false
      );

      sparkOpacity.value = withRepeat(
        withSequence(
          withDelay(1350, withTiming(1, { duration: 150 })),
          withTiming(0, { duration: 150 }),
          withDelay(1350, withTiming(0, { duration: 0 })),
        ),
        -1,
        false
      );

      wifiProgress.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      dangle.value = 0;
      sparkScale.value = 0.5;
      sparkOpacity.value = 0;
      wifiProgress.value = 0.5;
    }

    return () => {
      cancelAnimation(dangle);
      cancelAnimation(sparkScale);
      cancelAnimation(sparkOpacity);
      cancelAnimation(wifiProgress);
    };
  }, [shouldAnimate]);

  const cordRotation = useDerivedValue(() => {
    return interpolate(dangle.value, [0, 1], [-5, 5]);
  });

  const cordProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 12 },
      { rotate: `${cordRotation.value}deg` },
      { translateX: -12 },
    ] as any,
  }));

  const sparkProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 14 },
      { translateY: 31 },
      { scale: sparkScale.value },
      { translateX: -14 },
      { translateY: -31 },
    ] as any,
    opacity: sparkOpacity.value,
  }));

  const wifi1Opacity = useDerivedValue(() => interpolate(wifiProgress.value, [0, 0.4, 0.5, 0.9, 1], [0.2, 1, 1, 0.2, 0.2]));
  const wifi2Opacity = useDerivedValue(() => {
    const p = (wifiProgress.value + 0.3) % 1;
    return interpolate(p, [0, 0.4, 0.5, 0.9, 1], [0.2, 1, 1, 0.2, 0.2]);
  });
  const wifi3Opacity = useDerivedValue(() => {
    const p = (wifiProgress.value + 0.6) % 1;
    return interpolate(p, [0, 0.4, 0.5, 0.9, 1], [0.2, 1, 1, 0.2, 0.2]);
  });

  const wifi1Props = useAnimatedProps(() => ({ opacity: wifi1Opacity.value }));
  const wifi2Props = useAnimatedProps(() => ({ opacity: wifi2Opacity.value }));
  const wifi3Props = useAnimatedProps(() => ({ opacity: wifi3Opacity.value }));

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
          <ClipPath id="clip-tech-offline">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#clip-tech-offline)">
          {!transparentBg && (
            <Circle cx="24" cy="24" r="24" fill="#F1F5F9" />
          )}

          <G
            transform="translate(34, 12)"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <AnimatedCircle
              cx="0"
              cy="8"
              r="1.5"
              fill="#94A3B8"
              stroke="none"
              animatedProps={wifi1Props}
            />
            <AnimatedPath
              d="M -3 4 Q 0 1 3 4"
              animatedProps={wifi2Props}
            />
            <AnimatedPath
              d="M -6 0 Q 0 -4 6 0"
              animatedProps={wifi3Props}
            />
          </G>

          <Path d={FACE_PATH} fill="#E2E8F0" />

          <G>
            <Circle cx="16" cy="24" r="3" fill="#0F172A" />
            <Circle cx="32" cy="24" r="3" fill="#0F172A" />
            <Circle cx="15" cy="23" r="1" fill="#FFF" />
            <Circle cx="31" cy="23" r="1" fill="#FFF" />

            <Rect x="12" y="20" width="8" height="4" fill="#E2E8F0" />
            <Line
              x1="12"
              y1="24"
              x2="20"
              y2="24"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            <Rect x="28" y="20" width="8" height="4" fill="#E2E8F0" />
            <Line
              x1="28"
              y1="24"
              x2="36"
              y2="24"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </G>

          <Path
            d="M 20 34 Q 24 33 28 34"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <AnimatedG animatedProps={cordProps}>
            <Path
              d="M 12 0 Q 10 15 14 25"
              fill="none"
              stroke="#475569"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Path
              d="M 12 0 Q 10 15 14 25"
              fill="none"
              stroke="#64748B"
              strokeWidth="1"
              strokeLinecap="round"
            />

            <Line
              x1="14"
              y1="25"
              x2="13"
              y2="28"
              stroke="#EF4444"
              strokeWidth="1"
            />
            <Line
              x1="14"
              y1="25"
              x2="16"
              y2="27"
              stroke="#3B82F6"
              strokeWidth="1"
            />

            <AnimatedPath
              d="M 15 28 L 13 31 L 16 32 L 14 35"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeLinejoin="round"
              animatedProps={sparkProps}
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(SeveredConnectionFace);
