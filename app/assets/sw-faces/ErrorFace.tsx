import Animated, {
    useAnimatedProps,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
 cancelAnimation} from "react-native-reanimated";

import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";

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

const ErrorFace = ({
  size = 48,
  width,
  height,
  shouldAnimate = false,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  const blink = useSharedValue(1);
  const flicker = useSharedValue(0);

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
      flicker.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 100 }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      flicker.value = 0;
    }
  
    return () => {
      cancelAnimation(blink);
      cancelAnimation(flicker);
    };
  }, [shouldAnimate]);

  const blinkS = useDerivedValue(() => blink.value);
  const flickOp = useDerivedValue(() => 0.7 + flicker.value * 0.3);
  const flickX = useDerivedValue(() => flicker.value * 1);

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blinkS.value }] as any,
    originY: 21,
  }));
  const mouthProps = useAnimatedProps(() => ({
    opacity: flickOp.value,
    transform: [{ translateX: flickX.value }] as any,
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
            id="errM"
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
        <G mask="url(#errM)">
          <Path
            fill="#B0BEC5"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <Path
            fill="#ECEFF1"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
          <AnimatedG animatedProps={eyeProps}>
            <Circle cx="16" cy="22" r="2.5" fill="#455A64" />
            <Circle cx="32" cy="21" r="2.5" fill="#455A64" />
          </AnimatedG>
          <AnimatedPath
            d="M14 34l2-2l2 3l3-4l3 5l3-5l3 4l2-3l2 2"
            stroke="#455A64"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={mouthProps}
          />
        </G>
      </Svg>
    </View>
  );
};
export default React.memo(ErrorFace);
