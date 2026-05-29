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

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface FaceProps extends SvgProps {
  size?: number | string;
  shouldAnimate?: boolean;
  transparentBg?: boolean;
}

const FACE_PATH =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";

export const LoaderFace: React.FC<FaceProps> = ({
  size = 120,
  shouldAnimate = false,
  transparentBg = false,
  style,
  ...props
}) => {
  const blink = useSharedValue(1);
  const spin = useSharedValue(0);
  const dizzyProgress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      // Blink animation
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

      // Spin animation (Fast, linear)
      spin.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false,
      );

      // Dizzy cycle (5s normal + 2.5s dizzy)
      dizzyProgress.value = withRepeat(
        withTiming(1, { duration: 7500, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      blink.value = 1;
      spin.value = 0;
      dizzyProgress.value = 0;
    }

    return () => {
      cancelAnimation(blink);
      cancelAnimation(spin);
      cancelAnimation(dizzyProgress);
    };
  }, [shouldAnimate]);

  // Derived values for animations
  const isDizzy = useDerivedValue(() => {
    // 0 to 0.66 (5s) is normal, 0.66 to 0.93 (2s) is dizzy, 0.93 to 1.0 (0.5s) is reset
    const p = dizzyProgress.value;
    if (p > 0.66 && p < 0.93)
      return interpolate(p, [0.66, 0.7, 0.89, 0.93], [0, 1, 1, 0]);
    return 0;
  });

  const blinkProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 26 },
      { scaleY: blink.value },
      { translateX: -24 },
      { translateY: -26 },
    ] as any,
  }));

  const spinProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 24 },
      { translateY: 24 },
      { rotate: `${spin.value}deg` },
      { translateX: -24 },
      { translateY: -24 },
    ] as any,
  }));

  const pupilProps = useAnimatedProps(() => {
    const angle = (spin.value * Math.PI) / 180;
    const dizzy = isDizzy.value;

    // Normal follow movement
    const followX = Math.cos(angle) * 1.5;
    const followY = Math.sin(angle) * 1.5;

    // Dizzy spiral movement (much faster and erratic)
    const dizzyAngle = angle * 4;
    const dizzyX = Math.cos(dizzyAngle) * 2.5;
    const dizzyY = Math.sin(dizzyAngle) * 2.5;

    return {
      transform: [
        { translateX: interpolate(dizzy, [0, 1], [followX, dizzyX]) },
        { translateY: interpolate(dizzy, [0, 1], [followY, dizzyY]) },
      ] as any,
    };
  });

  const mouthProps = useAnimatedProps(() => {
    const dizzy = isDizzy.value;
    return {
      transform: [
        { translateX: 24 },
        { translateY: 37.5 },
        { scaleX: interpolate(dizzy, [0, 1], [1, 1.5]) },
        {
          rotate: `${interpolate(dizzy, [0, 1], [0, Math.sin(spin.value * 0.1) * 10])}deg`,
        },
        { translateX: -24 },
        { translateY: -37.5 },
      ] as any,
    };
  });

  return (
    <View
      style={[
        {
          width: size as any,
          height: size as any,
          borderRadius: (Number(size) || 120) / 2,
          overflow: "hidden",
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
          <ClipPath id="circleClip">
            <Circle cx="24" cy="24" r="24" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#circleClip)">
          {!transparentBg && <Circle cx="24" cy="24" r="24" fill="#1E293B" />}
          <Path
            fill="black"
            opacity={0.25}
            d={FACE_PATH}
            transform="translate(1, 1)"
          />
          <Path fill="#FFDABF" d={FACE_PATH} />

          {/* Loading Ring Prop - Background */}
          <Circle
            cx="24"
            cy="24"
            r="20"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="10 5"
            opacity={0.3}
          />

          {/* Animated Loading Ring */}
          <AnimatedG animatedProps={spinProps}>
            <Circle
              cx="24"
              cy="24"
              r="20"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="15 80"
              strokeLinecap="round"
            />
          </AnimatedG>

          {/* Eyes & Pupils */}
          <AnimatedG animatedProps={blinkProps}>
            <Circle
              cx="16"
              cy="26"
              r="4.5"
              fill="#FFF"
              stroke="#111215"
              strokeWidth="1.5"
            />
            <Circle
              cx="32"
              cy="26"
              r="4.5"
              fill="#FFF"
              stroke="#111215"
              strokeWidth="1.5"
            />
            <AnimatedG animatedProps={pupilProps}>
              <Circle cx="16" cy="26" r="2" fill="#111215" />
              <Circle cx="32" cy="26" r="2" fill="#111215" />
            </AnimatedG>
          </AnimatedG>

          {/* Mouth */}
          <AnimatedPath
            d="M 22 38 Q 24 37, 26 38"
            stroke="#111215"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            animatedProps={mouthProps}
          />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(LoaderFace);
