import React, { useEffect } from "react";
import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
  cancelAnimation} from "react-native-reanimated";

import { View } from "react-native";
import Svg, {
    Circle,
    Defs,
    G,
    Mask,
    Path,
    Rect,
    SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

interface SvgIconProps extends SvgProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  transparentBg?: boolean;
}

const OnCallFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  transparentBg = false,
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
            withTiming(0, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }),
          withTiming(0, { duration: 1000, easing: Easing.out(Easing.exp) }),
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
  const wigX = useDerivedValue(() => wiggle.value);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 24,
  }));
  const micProps = useAnimatedProps(() => ({
    transform: [{ translateX: wigX.value }] as any,
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
            id="onM"
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
        <G mask="url(#onM)">
          {!transparentBg && (
            <Path
              fill="#FF9040"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <Path
            fill="#FFB77F"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <Path
            stroke="#5D4037"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            d="M6 22c0-10 8-18 18-18s18 8 18 18"
          />
          <Rect x="40" y="18" width="6" height="12" rx="2" fill="#4E342E" />
          <AnimatedG animatedProps={micProps}>
            <Path
              stroke="#5D4037"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              d="M42 24l-6 10"
            />
            <Circle cx="36" cy="34" r="2.5" fill="#3E2723" />
          </AnimatedG>
          <AnimatedG animatedProps={eyeProps}>
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Circle cx="16.8" cy="24" r="2.5" fill="#4E342E" />
            <Circle cx="31.2" cy="24" r="2.5" fill="#4E342E" />
          </AnimatedG>
          <Path fill="#4E342E" d="M20 34q4 4 8 0z" />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(OnCallFace);
