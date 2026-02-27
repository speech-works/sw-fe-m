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

const Happy1 = ({
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
  const bounce = useSharedValue(0);

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
      bounce.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 800, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 800, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      bounce.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const bounceProps = useAnimatedProps(() => ({
    transform: [{ translateY: bounce.value }] as any,
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
          id="mask0_2132_4899"
          x={0}
          y={0}
          width={48}
          height={48}
          maskUnits="userSpaceOnUse"
        >
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </Mask>
        <G mask="url(#mask0_2132_4899)">
          <Path
            fill="#F9E7D9"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <AnimatedG animatedProps={bounceProps}>
            <G>
              <Path
                fill="#F7DFA9"
                d="M7.538 10.313c0-2.766 33.199-2.766 33.199 0 2.766 0 2.766 38.736 0 38.736 0 2.767-33.2 2.767-33.2 0-2.766 0-2.766-38.736 0-38.736"
              />
            </G>
            <AnimatedG animatedProps={eyeProps}>
              <Path
                fill="#fff"
                d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
              />
              <Path
                fill="#fff"
                d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
              />
              <Path
                fill="#2E2E2E"
                d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
              />
            </AnimatedG>
            <Path
              stroke="#4A4A4A"
              strokeLinecap="round"
              strokeWidth={3.558}
              d="M16.8 36q7.2 4.8 14.4 0"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(Happy1);
