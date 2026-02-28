import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect, SvgProps } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const MovieFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const sheenProgress = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      sheenProgress.value = withRepeat(
        withSequence(
          withDelay(
            1800,
            withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        loop ? -1 : repeatCount,
        false,
      );
    } else {
      sheenProgress.value = 0;
    }

    return () => {
      cancelAnimation(sheenProgress);
    };
  }, [shouldAnimate, loop, repeatCount]);

  const xPos = useDerivedValue(() => -5 + sheenProgress.value * 20);

  const glareProps = useAnimatedProps(() => ({
    transform: [{ translateX: xPos.value }] as any,
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
          fill="#5200B7"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          fill="black"
          opacity={0.25}
          transform="translate(4, 4)"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <G transform="translate(0, -2)">
          <Path fill="#FFF" d="M8 20 H 40 V 30 H 8 Z" />

          <Rect
            x="12"
            y="22"
            width="10"
            height="6"
            rx="1"
            fill="#FF4040"
            opacity="0.9"
          />
          <Rect
            x="26"
            y="22"
            width="10"
            height="6"
            rx="1"
            fill="#4047FF"
            opacity="0.9"
          />

          <AnimatedPath
            animatedProps={glareProps}
            fill="#FFF"
            opacity="0.6"
            d="M14 21 L 17 21 L 15 29 L 12 29 Z"
          />
          <AnimatedPath
            animatedProps={glareProps}
            fill="#FFF"
            opacity="0.6"
            d="M28 21 L 31 21 L 29 29 L 26 29 Z"
          />

          <Path stroke="#FFF" strokeWidth="2" d="M8 22 L 4 20" />
          <Path stroke="#FFF" strokeWidth="2" d="M40 22 L 44 20" />
        </G>
        <Circle
          cx="24"
          cy="36"
          r="2.5"
          stroke="#111215"
          strokeWidth="2"
          fill="none"
        />
      </Svg>
    </View>
  );
};

export default React.memo(MovieFace);
