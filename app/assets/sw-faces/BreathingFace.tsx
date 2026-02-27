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
} from "react-native-reanimated";
import Svg, { G, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
}

const BreathingFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      progress.value = withTiming(0);
    }
  }, [shouldAnimate]);

  const scale = useDerivedValue(() => 0.2 + 0.8 * progress.value);
  const rotate = useDerivedValue(() => progress.value * 20);
  const breathOpacity = useDerivedValue(() => 0.8 * (1 - progress.value));
  const eyeOffset = useDerivedValue(
    () => -1 + Math.sin(progress.value * Math.PI) * 1.0,
  );

  const breathProps = useAnimatedProps(() => ({
    opacity: breathOpacity.value,
    transform: [
      { translateX: 26 },
      { translateY: 34 },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
      { translateX: -26 },
      { translateY: -34 },
    ] as any,
  }));

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ translateY: eyeOffset.value }] as any,
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
        <Path
          fill="#BFC2FF"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          fill="black"
          opacity={0.25}
          transform="translate(1, 1)"
        />
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <AnimatedG animatedProps={eyeProps}>
          <Path
            stroke="#000340"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M14 24 Q 18 26, 22 24"
            fill="none"
          />
          <Path
            stroke="#000340"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M26 24 Q 30 26, 34 24"
            fill="none"
          />
        </AnimatedG>
        <Path
          stroke="#000340"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M22 34 Q 24 35, 26 34"
          fill="none"
        />
        <AnimatedPath
          stroke="#4047FF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          d="M30 34 C 34 32, 36 36, 34 38"
          animatedProps={breathProps}
        />
        <AnimatedPath
          stroke="#4047FF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          d="M32 36 C 36 34, 40 38, 38 42"
          animatedProps={breathProps}
        />
      </Svg>
    </View>
  );
};
export default React.memo(BreathingFace);
