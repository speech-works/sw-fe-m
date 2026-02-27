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
  useDerivedValue,
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
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const twitch = useSharedValue(0);
  const zzz1 = useSharedValue(0);
  const zzz2 = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      twitch.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 4000 + 4000,
            withTiming(1, { duration: 200, easing: Easing.out(Easing.exp) }),
          ),
          withTiming(0, { duration: 200, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        false,
      );
      zzz1.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
      zzz2.value = withRepeat(
        withSequence(
          withDelay(
            1250,
            withTiming(1, { duration: 2500, easing: Easing.out(Easing.exp) }),
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

  const eyeS = useDerivedValue(() => 1 + twitch.value * 0.1);
  const z1Y = useDerivedValue(() => zzz1.value * -10);
  const z1X = useDerivedValue(() => Math.sin(zzz1.value * 5) * 2);
  const z1Op = useDerivedValue(() => 1 - zzz1.value);
  const z2Y = useDerivedValue(() => zzz2.value * -10);
  const z2X = useDerivedValue(() => Math.cos(zzz2.value * 5) * 2);
  const z2Op = useDerivedValue(() => 1 - zzz2.value);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: eyeS.value }] as any,
    originY: 24,
  }));
  const zzz1Props = useAnimatedProps(() => ({
    transform: [{ translateY: z1Y.value }, { translateX: z1X.value }] as any,
    opacity: z1Op.value,
  }));
  const zzz2Props = useAnimatedProps(() => ({
    transform: [{ translateY: z2Y.value }, { translateX: z2X.value }] as any,
    opacity: z2Op.value,
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
          fill="#311B92"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          fill="#D1C4E9"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <AnimatedG animatedProps={eyeProps}>
          <Path
            stroke="#311B92"
            strokeWidth="3"
            strokeLinecap="round"
            d="M12 24q4.8 4 9.6 0M26.4 24q4.8 4 9.6 0"
          />
        </AnimatedG>
        <Path
          stroke="#311B92"
          strokeWidth="3"
          strokeLinecap="round"
          d="M22 34h4"
        />
        <AnimatedPath
          fill="#B39DDB"
          stroke="#B39DDB"
          strokeWidth="2"
          strokeLinejoin="round"
          d="M35 8h5l-5 6h5"
          animatedProps={zzz1Props}
        />
        <AnimatedPath
          fill="#B39DDB"
          stroke="#B39DDB"
          strokeWidth="1.5"
          strokeLinejoin="round"
          d="M40 4h4l-4 4h4"
          animatedProps={zzz2Props}
        />
      </Svg>
    </View>
  );
};
export default React.memo(SleepyFace);
