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

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const Sad1 = ({
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
  const blink = useSharedValue(1);
  const droop = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 3000 + 4000,
            withTiming(0.2, { duration: 300 }),
          ),
          withTiming(1, { duration: 300 }),
        ),
        -1,
        false,
      );
      droop.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      droop.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const browProps = useAnimatedProps(() => ({
    transform: [{ translateY: droop.value }] as any,
  }));

  return (
    <View
      style={{
        width: activeWidth as any,
        height: activeHeight as any,
        borderRadius: (typeof activeWidth === "number" ? activeWidth : 48) / 2,
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
        <Mask
          id="mask0_2132_4885"
          x={0}
          y={0}
          width={48}
          height={48}
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
        >
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          ></Path>
        </Mask>
        <G mask="url(#mask0_2132_4885)">
          <Path
            fill="#E6E8FF"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          ></Path>
          <G>
            <Path
              fill="#BEEDE8"
              d="M7.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.199 2.766-33.199 0-2.767 0-2.767-38.736 0-38.736"
            ></Path>
          </G>
          <AnimatedG animatedProps={eyeProps}>
            <Path
              fill="#FAFBFC"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            ></Path>
            <Path
              fill="#FAFBFC"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            ></Path>
            <Path
              fill="#5B5B5B"
              d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
            ></Path>
          </AnimatedG>
          <AnimatedG animatedProps={browProps}>
            <Path
              fill="#5B5B5B"
              d="M23.298 12.913 11.707 16.02l.994 3.71 11.591-3.107z"
            ></Path>
            <Path
              fill="#5B5B5B"
              d="m36.292 16.019-11.591-3.106-.994 3.71 11.591 3.105z"
            ></Path>
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(Sad1);
