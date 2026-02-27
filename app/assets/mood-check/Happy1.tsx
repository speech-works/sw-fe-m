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
} from "react-native-reanimated";
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

const Happy1 = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;
  const blink = useSharedValue(1);
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      bounce.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 800, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      bounce.value = 0;
    }
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const bncY = useDerivedValue(() => bounce.value);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const bounceProps = useAnimatedProps(() => ({
    transform: [{ translateY: bncY.value }] as any,
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
            id="hap1M"
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
        <G mask="url(#hap1M)">
          <Path
            fill="#F9E7D9"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <AnimatedG animatedProps={bounceProps}>
            <Path
              fill="#F7DFA9"
              d="M7.538 10.313c0-2.766 33.199-2.766 33.199 0 2.766 0 2.766 38.736 0 38.736 0 2.767-33.2 2.767-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
            <AnimatedG animatedProps={eyeProps}>
              <Circle cx="16.8" cy="24" r="7.2" fill="#fff" />
              <Circle cx="31.2" cy="24" r="7.2" fill="#fff" />
              <Circle cx="16.8" cy="24" r="4.32" fill="#2E2E2E" />
              <Circle cx="31.2" cy="24" r="4.32" fill="#2E2E2E" />
            </AnimatedG>
            <Path
              stroke="#4A4A4A"
              strokeLinecap="round"
              strokeWidth={3.558}
              d="M16.8 36q7.2 4.8 14.4 0"
              fill="none"
            />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(Happy1);
