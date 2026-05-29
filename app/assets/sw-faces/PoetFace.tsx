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
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

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

const PoetFace = ({
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
            withTiming(0.1, { duration: 120 }),
          ),
          withTiming(1, { duration: 120 }),
        ),
        -1,
        false,
      );
      wiggle.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.out(Easing.exp) }),
        -1,
        true, // This makes it go 0 -> 1 -> 0 -> 1...
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
  const wigY = useDerivedValue(() => wiggle.value * 0.5);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 23.5,
  }));
  const hairProps = useAnimatedProps(() => ({
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
        <Defs>
          <Mask
            id="poeM"
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
        <G mask="url(#poeM)">
          {!transparentBg && (
            <Path
              fill="#c49ccdff"
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
            />
          )}
          <Path
            fill="#edcfbbff"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={hairProps}>
            <Path
              fill="#795548"
              d="M4 18c0-7 3-10 6-10c3 1 2 9-1 20zM44 18c0-7-3-10-6-10c-3 1-2 9 1 20z"
            />
          </AnimatedG>
          <G
            stroke="#4CAF50"
            strokeWidth="4"
            fill="#B0BEC5"
            strokeLinecap="round"
          >
            <Circle cx="16.8" cy="24" r="8" />
            <Circle cx="31.2" cy="24" r="8" />
            <Path d="M24.8 24l-1.6 0M10 24l-3 0M38 24l3 0" />
          </G>
          <Circle cx="16.8" cy="24" r="6" fill="#E0F2F7" opacity="0.8" />
          <Circle cx="31.2" cy="24" r="6" fill="#E0F2F7" opacity="0.8" />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16.8" cy="23" r="3" fill="#212121" />
            <Circle cx="31.2" cy="23" r="3" fill="#212121" />
            <Circle cx="17.5" cy="22" r="0.8" fill="#FFF" />
            <Circle cx="31.9" cy="22" r="0.8" fill="#FFF" />
          </AnimatedG>
          <Path
            d="M21 34q3 1 6 0"
            stroke="#212121"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(PoetFace);
