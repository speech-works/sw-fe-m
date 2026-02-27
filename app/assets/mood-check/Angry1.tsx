import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { G, Mask, Path, SvgProps } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Angry1Props extends SvgProps {
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const Angry1 = ({
  width = 48,
  height = 48,
  shouldAnimate = false,
  loop = false,
  repeatCount = 1,
  ...props
}: Angry1Props) => {
  const blink = useSharedValue(1);
  const furrow = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      furrow.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 600,
            easing: Easing.bezier(0.33, 1, 0.68, 1),
          }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      furrow.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const browProps = useAnimatedProps(() => ({
    transform: [{ translateY: furrow.value * 1.5 }] as any,
  }));

  return (
    <View
      style={{
        width: width as any,
        height: height as any,
        borderRadius: (typeof width === "number" ? width : 48) / 2,
        overflow: "hidden",
      }}
    >
      <Svg
        width={width}
        height={height}
        viewBox="0 0 48 48"
        fill="none"
        {...props}
      >
        <Mask
          id="mask0"
          x={0}
          y={0}
          width={48}
          height={48}
          maskUnits="userSpaceOnUse"
        >
          <Path
            fill="#fff"
            d="M24 0C10.745 0 0 10.745 0 24s10.745 24 24 24 24-10.745 24-24S37.255 0 24 0"
          />
        </Mask>
        <G mask="url(#mask0)">
          <Path
            fill="#FFD6D6"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            <Path
              fill="#F28B82"
              d="M7.628 10.176c0-2.805 33.119-2.805 33.119 0 2.76 0 2.76 39.26 0 39.26 0 2.805-33.119 2.805-33.119 0-2.76 0-2.76-39.26 0-39.26"
            />
          </G>
          <AnimatedG animatedProps={browProps}>
            <Path
              fill="#4A4A4A"
              d="m24.292 16.019-11.591-3.106-.994 3.71 11.591 3.105z"
            />
            <Path
              fill="#4A4A4A"
              d="M35.298 12.913 23.707 16.02l.994 3.71 11.591-3.107z"
            />
          </AnimatedG>
          <AnimatedG animatedProps={eyeProps}>
            <Path
              fill="#FFF8F8"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#FFF8F8"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#6D6D6D"
              d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(Angry1);
