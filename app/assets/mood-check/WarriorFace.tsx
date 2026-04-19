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
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const WarriorFace = ({
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
    let timeout: ReturnType<typeof setTimeout>;

    if (shouldAnimate) {
      timeout = setTimeout(() => {
        progress.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) }),
            withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) }),
          ),
          -1,
          false,
        );
      }, 400); // delay to prevent UI thread deadlock during transiton
    } else {
      progress.value = 0;
    }

    return () => {
      clearTimeout(timeout);
      cancelAnimation(progress);
    };
  }, [shouldAnimate]);

  const eyeY = useDerivedValue(() => progress.value * 2);
  const upperRotate = useDerivedValue(() => (1 - progress.value) * 45);
  const lowerRotate = useDerivedValue(() => (1 - progress.value) * -30);

  const eyebrowProps = useAnimatedProps(() => ({
    transform: [{ translateY: eyeY.value }] as any,
  }));
  const upperKnotProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 42 },
      { translateY: 16 },
      { rotate: `${upperRotate.value}deg` },
      { translateX: -42 },
      { translateY: -16 },
    ] as any,
  }));
  const lowerKnotProps = useAnimatedProps(() => ({
    transform: [
      { translateX: 42 },
      { translateY: 18 },
      { rotate: `${lowerRotate.value}deg` },
      { translateX: -42 },
      { translateY: -18 },
    ] as any,
  }));

  return (
    <View
      pointerEvents="none"
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
          fill="#FF7043"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          fill="#FFCCBC"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <Path fill="#D32F2F" d="M5 14h39v6H5z" />
        <AnimatedG animatedProps={upperKnotProps}>
          <Path stroke="#D32F2F" strokeWidth="3" d="M42 16l4-4" />
        </AnimatedG>
        <AnimatedG animatedProps={lowerKnotProps}>
          <Path stroke="#D32F2F" strokeWidth="3" d="M42 18l4 4" />
        </AnimatedG>
        <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
        <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
        <Circle cx="16.8" cy="24.32" r="4.32" fill="#3E2723" />
        <Circle cx="31.2" cy="24.32" r="4.32" fill="#3E2723" />
        <AnimatedG animatedProps={eyebrowProps}>
          <Path
            stroke="#3E2723"
            strokeWidth="3"
            strokeLinecap="round"
            d="M12 13l8 3M36 13l-8 3"
          />
        </AnimatedG>
        <Path
          stroke="#3E2723"
          strokeWidth="3"
          strokeLinecap="round"
          d="M20 34h8"
        />
      </Svg>
    </View>
  );
};
export default React.memo(WarriorFace);
