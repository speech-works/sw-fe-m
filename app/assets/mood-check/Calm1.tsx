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
 cancelAnimation} from "react-native-reanimated";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
  width?: number | string;
  height?: number | string;
}

const Calm1 = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 4000,
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1500, easing: Easing.out(Easing.exp) }),
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      pulse.value = 1;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(pulse);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const pulseS = useDerivedValue(() => pulse.value);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const pulseProps = useAnimatedProps(() => ({
    transform: [{ scale: pulseS.value }] as any,
    originX: 24,
    originY: 24,
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
          <Mask
            id="cal1M"
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
        <G mask="url(#cal1M)">
          <Path
            fill="#B8DCC2"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <AnimatedG animatedProps={pulseProps}>
            <Path
              fill="#E7E2CB"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </AnimatedG>
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="24" r="7.2" fill="#fff" />
            <Circle cx="31.2" cy="24" r="7.2" fill="#fff" />
            <Circle cx="16.8" cy="24" r="4.32" fill="#4A4A4A" />
            <Circle cx="31.2" cy="24" r="4.32" fill="#4A4A4A" />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(Calm1);
