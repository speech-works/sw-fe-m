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
  SvgProps,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const FACE_PATH =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";
const SKIN_COLOR = "#FFDABF";
const INK_COLOR = "#111215";

export interface FaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

/**
 * 1. THE BUTTERFLY (Delight / Success)
 * Animation: A delicate butterfly flutters down and lands perfectly on the nose.
 * The eyes follow it down and cross slightly as it lands, forming a soft smile.
 */
export const ButterflyFace: React.FC<FaceProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  style,
  ...props
}) => {
  const cycleProgress = useSharedValue(0); // 6s cycle for the whole sequence
  const flap = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      cycleProgress.value = withRepeat(
        withTiming(1, { duration: 6000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        -1,
        false
      );

      flap.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 100 }),
          withTiming(1, { duration: 100 }),
        ),
        -1,
        true
      );
    } else {
      cycleProgress.value = 0;
      flap.value = 1;
    }

    return () => {
      cancelAnimation(cycleProgress);
      cancelAnimation(flap);
    };
  }, [shouldAnimate]);

  // Animation derived values
  const flyX = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.3, 0.7, 0.85, 1], [15, 15, 0, 0, -15, -15]);
  });
  const flyY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.3, 0.7, 1], [-20, 0, 0, -20]);
  });
  const flyOpacity = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  });

  const eyeTrackXLeft = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.3, 0.7, 0.85, 1], [2, 2, 3, 3, -2, -2]);
  });
  const eyeTrackXRight = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.3, 0.7, 0.85, 1], [2, 2, -3, -3, -2, -2]);
  });
  const eyeTrackY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.3, 0.7, 0.85, 1], [-3, -3, 1, 1, -3, -3]);
  });

  const smileScaleY = useDerivedValue(() => {
    return interpolate(cycleProgress.value, [0, 0.15, 0.3, 0.7, 0.85, 1], [0.5, 0.5, 1, 1, 0.5, 0.5]);
  });

  // Animated props
  const flyProps = useAnimatedProps(() => ({
    transform: [
      { translateX: flyX.value },
      { translateY: flyY.value },
    ] as any,
    opacity: flyOpacity.value,
  }));

  const flapProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { scaleX: flap.value },
      { translateX: -24 },
    ] as any,
  }));

  const leftPupilProps = useAnimatedProps(() => ({
    transform: [
      { translateX: eyeTrackXLeft.value },
      { translateY: eyeTrackY.value },
    ] as any,
  }));

  const rightPupilProps = useAnimatedProps(() => ({
    transform: [
      { translateX: eyeTrackXRight.value },
      { translateY: eyeTrackY.value },
    ] as any,
  }));

  const smileProps = useAnimatedProps(() => ({
    transform: [
      { translateY: 34 },
      { scaleY: smileScaleY.value },
      { translateY: -34 },
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
          <ClipPath id="clip-butterfly-face">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#clip-butterfly-face)">
          {!transparentBg && (
            <Circle cx="24" cy="24" r="24" fill="#FDF4FF" />
          )}
          <Path d={FACE_PATH} fill={SKIN_COLOR} />

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

          <AnimatedCircle
            cx="16"
            cy="24"
            r="2"
            fill={INK_COLOR}
            animatedProps={leftPupilProps}
          />
          <AnimatedCircle
            cx="32"
            cy="24"
            r="2"
            fill={INK_COLOR}
            animatedProps={rightPupilProps}
          />

          <AnimatedPath
            d="M 20 34 Q 24 37 28 34"
            fill="none"
            stroke={INK_COLOR}
            strokeWidth="1.5"
            strokeLinecap="round"
            animatedProps={smileProps}
          />

          <AnimatedG animatedProps={flyProps}>
            <AnimatedG
              animatedProps={flapProps}
            >
              <Path
                d="M 24 23 L 16 17 L 18 27 Z"
                fill="#D946EF"
                stroke="#86198F"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              <Path
                d="M 24 23 L 32 17 L 30 27 Z"
                fill="#F472B6"
                stroke="#86198F"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </AnimatedG>
            <Rect
              x="23.5"
              y="20"
              width="1"
              height="6"
              rx="0.5"
              fill="#4A044E"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(ButterflyFace);
