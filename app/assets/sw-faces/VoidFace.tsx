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
}

export const VoidFace: React.FC<SvgIconProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  style,
  ...props
}) => {
  const blink = useSharedValue(1);
  const cycleProgress = useSharedValue(0); // 4s cycle for leaf and tracking

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
        withTiming(1, { duration: 4000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        -1,
        false
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

  const leafProps = useAnimatedProps(() => ({
    transform: [
      { translateX: leafX.value },
      { translateY: leafY.value },
      { rotate: `${leafRotate.value}deg` },
    ] as any,
    opacity: leafOpacity.value,
  }));

  const pupilProps = useAnimatedProps(() => {
    // Track the leaf: cycleProgress goes 0 -> 1, leaf goes Left -> Right
    // Pupils should move -3 to +3 horizontally
    return {
      transform: [
        { translateX: interpolate(cycleProgress.value, [0, 1], [-3, 3]) },
        { translateY: interpolate(cycleProgress.value, [0, 0.5, 1], [1, -1, 1]) },
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
          <ClipPath id="clip-void">
            <Circle cx="24" cy="24" r="24" />
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

          <Path d={FACE_PATH} fill={SKIN_COLOR} />

          {/* Eyes tracking the leaf */}
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

          {/* Neutral, slightly wistful mouth */}
          <Path
            d="M 21 34 Q 24 33 27 34"
            fill="none"
            stroke={INK_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Twirling Autumn Leaf */}
          <AnimatedG animatedProps={leafProps}>
            <Path
              d="M 0 0 C 4 -6 10 -2 12 4 C 10 10 4 6 0 0 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <Line
              x1="0"
              y1="0"
              x2="8"
              y2="2"
              stroke="#D97706"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(VoidFace);
