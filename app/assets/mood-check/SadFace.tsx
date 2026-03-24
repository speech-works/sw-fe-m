import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Pattern,
  Rect,
  Stop,
  SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const SadFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const tear = useSharedValue(0);
  const quiver = useSharedValue(0);
  const rain = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      tear.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1200, easing: Easing.out(Easing.exp) }),
          withTiming(1, { duration: 1200, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
      rain.value = withRepeat(
        withTiming(1, { duration: 450, easing: Easing.linear }),
        -1,
        false,
      );
      quiver.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1500 }),
          withTiming(1, { duration: 30 }),
          withTiming(-1, { duration: 30 }),
          withTiming(0, { duration: 30 }),
        ),
        -1,
        true,
      );
    } else {
      tear.value = 0;
      quiver.value = 0;
      rain.value = 0;
    }

    return () => {
      cancelAnimation(tear);
      cancelAnimation(quiver);
      cancelAnimation(rain);
    };
  }, [shouldAnimate]);

  const rainOffset = useDerivedValue(() => -rain.value * 20);
  const mouthX = useDerivedValue(() => quiver.value * 0.5);
  const tY = useDerivedValue(() => 12 - 4 * tear.value);
  const tOp = useDerivedValue(() => 0.9 * tear.value);

  const rainProps = useAnimatedProps(() => ({
    strokeDashoffset: rainOffset.value,
  }));
  const mouthProps = useAnimatedProps(() => ({
    transform: [{ translateX: mouthX.value }] as any,
    originX: 24,
    originY: 39,
  }));
  const tearProps = useAnimatedProps(() => ({
    transform: [{ translateY: tY.value }] as any,
    opacity: tOp.value,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (Number(activeWidth) || 48) / 2,
        overflow: "hidden",
      }}
    >
      <Svg
        width={activeWidth}
        height={activeHeight}
        viewBox="0 0 48 48"
        fill="none"
        {...props}
      >
        <Defs>
          <LinearGradient id="tearG" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#81D4FA" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#0288D1" stopOpacity="1" />
          </LinearGradient>
          <Mask id="LMask">
            <Circle cx="16.8" cy="24" r="7.2" fill="white" />
          </Mask>
          <Mask id="RMask">
            <Circle cx="31.2" cy="24" r="7.2" fill="white" />
          </Mask>
        </Defs>
        <Path
          fill="#E6E8FF"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <AnimatedPath
          d="M6 -10v68 M18 -10v68 M30 -10v68 M42 -10v68"
          stroke="#000"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.25"
          strokeDasharray="6 14"
          animatedProps={rainProps}
        />
        <Path
          fill="#BEEDE8"
          d="M7.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.199 2.766-33.199 0-2.767 0-2.767-38.736 0-38.736"
        />
        <Circle cx="16.8" cy="24" r="7.2" fill="#FAFBFC" />
        <Circle cx="31.2" cy="24" r="7.2" fill="#FAFBFC" />
        <G mask="url(#LMask)">
          <AnimatedG animatedProps={tearProps}>
            <Circle cx="16.8" cy="28" r="8" fill="url(#tearG)" />
            <Circle cx="15" cy="25" r="1.2" fill="#FFF" opacity="0.4" />
          </AnimatedG>
        </G>
        <G mask="url(#RMask)">
          <AnimatedG animatedProps={tearProps}>
            <Circle cx="31.2" cy="28" r="8" fill="url(#tearG)" />
            <Circle cx="29.4" cy="25" r="1.2" fill="#FFF" opacity="0.4" />
          </AnimatedG>
        </G>
        <Path
          fill="#5B5B5B"
          d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
        />
        <Path
          fill="#5B5B5B"
          d="M23.298 12.913L11.707 16.02l0.994 3.71 11.591-3.107zM36.292 16.019l-11.591-3.106-0.994 3.71 11.591 3.105z"
        />
        <AnimatedG animatedProps={mouthProps}>
          <Path
            d="M22 39q2-2 4 0"
            stroke="#5B5B5B"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>
      </Svg>
    </View>
  );
};
export default React.memo(SadFace);
