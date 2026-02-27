import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Defs, G, Mask, Path, Circle, SvgProps } from "react-native-svg";
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

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const ThinkerFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 120, easing: Easing.out(Easing.exp) }),
          ),
          withTiming(1, { duration: 120, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        false,
      );
      bob.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      bob.value = 0;
    }
  }, [shouldAnimate]);

  const eyeScale = useDerivedValue(() => blink.value);
  const bobPos = useDerivedValue(() => bob.value);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: eyeScale.value }] as any,
    originY: 22,
  }));
  const bobProps = useAnimatedProps(() => ({
    transform: [{ translateY: bobPos.value }] as any,
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
          fill="#546E7A"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <AnimatedG animatedProps={bobProps}>
          <Path
            fill="#ECEFF1"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="31.2" cy="24" r="7.2" fill="#FFF" />
            <Circle cx="18" cy="22" r="2.5" fill="#37474F" />
            <Circle cx="32.4" cy="22" r="2.5" fill="#37474F" />
          </AnimatedG>
          <Path
            stroke="#37474F"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M12 16h8M28 14q4-4 8 0M22 32h4"
          />
          <Path fill="#CFD8DC" d="M30 48v-10c0-2 4-4 8 0l4 6" />
          <Circle cx="30" cy="36" r="4" fill="#CFD8DC" />
        </AnimatedG>
      </Svg>
    </View>
  );
};
export default React.memo(ThinkerFace);
