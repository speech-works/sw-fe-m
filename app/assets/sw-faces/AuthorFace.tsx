import React, { useEffect } from "react";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
 cancelAnimation} from "react-native-reanimated";

import { Easing, View } from "react-native";
import Svg, { Circle, G, Path, SvgProps } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}

const AuthorFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const blink = useSharedValue(1);
  const wiggle = useSharedValue(0);

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
      wiggle.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      wiggle.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(wiggle);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const wigY = useDerivedValue(() => wiggle.value);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const musProps = useAnimatedProps(() => ({
    transform: [{ translateY: wigY.value }] as any,
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
          fill="#558B2F"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <Path
          fill="#A1887F"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        <G stroke="#6D4C41" strokeWidth="4" fill="none" strokeLinecap="round">
          <Circle cx="16.8" cy="24" r="8" />
          <Circle cx="31.2" cy="24" r="8" />
          <Path d="M24.8 24H23.2M10 24H7M38 24h3" />
        </G>
        <AnimatedG animatedProps={eyeProps}>
          <Circle cx="16.8" cy="24" r="2.5" fill="#6D4C41" />
          <Circle cx="31.2" cy="24" r="2.5" fill="#6D4C41" />
          <Circle cx="17.5" cy="23" r="0.7" fill="#FFF" opacity="0.8" />
          <Circle cx="31.9" cy="23" r="0.7" fill="#FFF" opacity="0.8" />
        </AnimatedG>
        <AnimatedPath
          d="M16 29q4 6 8 6t8-6"
          stroke="#3E2723"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#3E2723"
          animatedProps={musProps}
        />
        <Path
          d="M10 34c-4 2-4 14 0 16c8 3 20 3 28 0c4-2 4-14 0-16z"
          fill="#3E2723"
          opacity="0.25"
        />
        <G fill="#3E2723" opacity="0.35">
          <Circle cx="13" cy="43" r="0.5" />
          <Circle cx="17" cy="46" r="0.6" />
          <Circle cx="24" cy="48" r="0.7" />
          <Circle cx="31" cy="46" r="0.6" />
          <Circle cx="35" cy="43" r="0.5" />
          <Circle cx="15" cy="40" r="0.4" />
          <Circle cx="33" cy="40" r="0.4" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(AuthorFace);
