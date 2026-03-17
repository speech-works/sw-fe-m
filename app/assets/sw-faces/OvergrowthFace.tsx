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
  Line,
  SvgProps,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const FACE_PATH =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";
const INK_COLOR = "#1E293B";

export interface FaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

/**
 * 1. THE OVERGROWTH (404 Not Found / Lost)
 * Props: Curling vines + Glowing fireflies.
 * Eyes: Wide, emerald irises with beautiful highlights, tracking the fireflies.
 */
export const OvergrowthFace: React.FC<FaceProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  style,
  ...props
}) => {
  const vineProgress = useSharedValue(0); // 0 to 1
  const firefly1X = useSharedValue(12);
  const firefly1Y = useSharedValue(16);
  const firefly2X = useSharedValue(36);
  const firefly2Y = useSharedValue(12);

  useEffect(() => {
    if (shouldAnimate) {
      vineProgress.value = withRepeat(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );

      // Firefly 1 movement
      firefly1X.value = withRepeat(
        withSequence(
          withTiming(12, { duration: 0 }),
          withTiming(18, { duration: 1333 }),
          withTiming(8, { duration: 1333 }),
          withTiming(12, { duration: 1334 }),
        ),
        -1,
        false
      );
      firefly1Y.value = withRepeat(
        withSequence(
          withTiming(16, { duration: 0 }),
          withTiming(8, { duration: 1333 }),
          withTiming(4, { duration: 1333 }),
          withTiming(16, { duration: 1334 }),
        ),
        -1,
        false
      );

      // Firefly 2 movement
      firefly2X.value = withRepeat(
        withSequence(
          withDelay(1000, withTiming(28, { duration: 2500 })),
          withTiming(36, { duration: 2500 }),
        ),
        -1,
        false
      );
      firefly2Y.value = withRepeat(
        withSequence(
          withDelay(1000, withTiming(6, { duration: 2500 })),
          withTiming(12, { duration: 2500 }),
        ),
        -1,
        false
      );
    } else {
      vineProgress.value = 0.2; // Show partially grown
    }

    return () => {
      cancelAnimation(vineProgress);
      cancelAnimation(firefly1X);
      cancelAnimation(firefly1Y);
      cancelAnimation(firefly2X);
      cancelAnimation(firefly2Y);
    };
  }, [shouldAnimate]);

  // Derived values for eye tracking
  const eyeTrackX = useDerivedValue(() => {
    const avgX = (firefly1X.value + firefly2X.value + 48) / 3;
    return interpolate(avgX, [0, 48], [-2, 2]);
  });
  const eyeTrackY = useDerivedValue(() => {
    const avgY = (firefly1Y.value + firefly2Y.value) / 2;
    return interpolate(avgY, [0, 48], [-3, 1]);
  });

  const vineDashOffset = useDerivedValue(() => {
    return interpolate(vineProgress.value, [0, 0.2, 0.9, 1], [60, 0, 0, -60]);
  });
  const vineOpacity = useDerivedValue(() => {
    return interpolate(vineProgress.value, [0, 0.2, 0.9, 1], [0, 1, 1, 0]);
  });

  // Animated Props
  const eyeTrackingProps = useAnimatedProps(() => ({
    transform: [
      { translateX: eyeTrackX.value },
      { translateY: eyeTrackY.value },
    ] as any,
  }));

  const firefly1Props = useAnimatedProps(() => ({
    transform: [
      { translateX: firefly1X.value },
      { translateY: firefly1Y.value },
    ] as any,
  }));

  const firefly2Props = useAnimatedProps(() => ({
    transform: [
      { translateX: firefly2X.value },
      { translateY: firefly2Y.value },
    ] as any,
  }));

  const vinePathProps = useAnimatedProps(() => ({
    strokeDashoffset: vineDashOffset.value,
    opacity: vineOpacity.value,
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
          <ClipPath id="clip-overgrowth">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#clip-overgrowth)">
          {!transparentBg && (
            <Circle cx="24" cy="24" r="24" fill="#042F2E" />
          )}
          <Path d={FACE_PATH} fill="#FEF3C7" />

          {/* Pretty Eyes */}
          <G>
            <Circle
              cx="15"
              cy="24"
              r="4.5"
              fill="#FFF"
              stroke={INK_COLOR}
              strokeWidth="1.5"
            />
            <Circle
              cx="33"
              cy="24"
              r="4.5"
              fill="#FFF"
              stroke={INK_COLOR}
              strokeWidth="1.5"
            />

            <AnimatedG animatedProps={eyeTrackingProps}>
              {/* Emerald Iris */}
              <Circle cx="15" cy="24" r="3.5" fill="#10B981" />
              <Circle cx="33" cy="24" r="3.5" fill="#10B981" />
              {/* Pupil */}
              <Circle cx="15" cy="24" r="2" fill={INK_COLOR} />
              <Circle cx="33" cy="24" r="2" fill={INK_COLOR} />
              {/* Catchlights */}
              <Circle cx="14" cy="23" r="1.2" fill="#FFF" />
              <Circle cx="16.5" cy="25" r="0.6" fill="#FFF" />
              <Circle cx="32" cy="23" r="1.2" fill="#FFF" />
              <Circle cx="34.5" cy="25" r="0.6" fill="#FFF" />
            </AnimatedG>

            {/* Elegant Eyelashes */}
            <Path
              d="M 10 22 Q 15 17 20 22"
              fill="none"
              stroke={INK_COLOR}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <Line
              x1="10.5"
              y1="21"
              x2="9"
              y2="19"
              stroke={INK_COLOR}
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            <Path
              d="M 28 22 Q 33 17 38 22"
              fill="none"
              stroke={INK_COLOR}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <Line
              x1="37.5"
              y1="21"
              x2="39"
              y2="19"
              stroke={INK_COLOR}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </G>

          {/* Lost Mouth */}
          <Circle cx="24" cy="35" r="2" fill={INK_COLOR} opacity={0.8} />

          {/* Growing Vines */}
          <G>
            <AnimatedPath
              d="M -5 30 Q 15 45 25 38 T 45 48"
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="60"
              animatedProps={vinePathProps}
            />
            <G opacity={shouldAnimate ? undefined : 1}>
               <Path d="M 10 38 Q 12 35 15 38" fill="#10B981" />
               <Path d="M 35 44 Q 38 41 40 44" fill="#10B981" />
            </G>
          </G>

          {/* Fireflies */}
          <AnimatedG animatedProps={firefly1Props}>
            <Circle cx="0" cy="0" r="1.5" fill="#D9F99D" />
            <Circle cx="0" cy="0" r="3" fill="#84CC16" opacity={0.3} />
          </AnimatedG>
          <AnimatedG animatedProps={firefly2Props}>
            <Circle cx="0" cy="0" r="1.5" fill="#D9F99D" />
            <Circle cx="0" cy="0" r="3" fill="#84CC16" opacity={0.3} />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(OvergrowthFace);
