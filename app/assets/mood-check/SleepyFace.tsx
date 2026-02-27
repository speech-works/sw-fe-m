import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Defs, G, Mask, Path, SvgProps } from "react-native-svg";
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

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const SleepyFace = ({
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

  const twitch = useSharedValue(0);
  const zzz1 = useSharedValue(0);
  const zzz2 = useSharedValue(0);

  React.useEffect(() => {
    if (shouldAnimate) {
      twitch.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 4000 + 4000,
            withTiming(1, { duration: 200 }),
          ),
          withTiming(0, { duration: 200 }),
        ),
        -1,
        false,
      );
      zzz1.value = withRepeat(
        withSequence(
          withDelay(
            0,
            withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
      zzz2.value = withRepeat(
        withSequence(
          withDelay(
            1250,
            withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      twitch.value = 0;
      zzz1.value = 0;
      zzz2.value = 0;
    }
  }, [shouldAnimate]);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: 1 + twitch.value * 0.1 }] as any,
    originY: 24,
  }));

  const zzz1Props = useAnimatedProps(() => ({
    transform: [
      { translateY: zzz1.value * -10 },
      { translateX: Math.sin(zzz1.value * 5) * 2 },
    ] as any,
    opacity: 1 - zzz1.value,
  }));

  const zzz2Props = useAnimatedProps(() => ({
    transform: [
      { translateY: zzz2.value * -10 },
      { translateX: Math.cos(zzz2.value * 5) * 2 },
    ] as any,
    opacity: 1 - zzz2.value,
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
        <Defs>
          <Mask
            id="sleepy_mask"
            x="0"
            y="0"
            width="48"
            height="48"
            maskUnits="userSpaceOnUse"
          >
            <Path
              fill="#fff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          </Mask>
        </Defs>
        <G mask="url(#sleepy_mask)">
          {/* Background - Night Purple */}
          <Path
            fill="#311B92"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            {/* Face Shape - Light Lavender */}
            <Path
              fill="#D1C4E9"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={eyeProps}>
            {/* Closed Eyes (Dark Crescents) */}
            <Path
              stroke="#311B92"
              strokeWidth="3"
              strokeLinecap="round"
              d="M12 24 Q 16.8 28, 21.6 24"
            />
            <Path
              stroke="#311B92"
              strokeWidth="3"
              strokeLinecap="round"
              d="M26.4 24 Q 31.2 28, 36 24"
            />
          </AnimatedG>

          {/* Small Mouth */}
          <Path
            stroke="#311B92"
            strokeWidth="3"
            strokeLinecap="round"
            d="M22 34 L 26 34"
          />

          {/* Zzz */}
          <AnimatedPath
            fill="#B39DDB"
            d="M35 8 L 40 8 L 35 14 L 40 14"
            stroke="#B39DDB"
            strokeWidth="2"
            strokeLinejoin="round"
            animatedProps={zzz1Props}
          />
          <AnimatedPath
            fill="#B39DDB"
            d="M40 4 L 44 4 L 40 8 L 44 8"
            stroke="#B39DDB"
            strokeWidth="1.5"
            strokeLinejoin="round"
            animatedProps={zzz2Props}
          />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(SleepyFace);
