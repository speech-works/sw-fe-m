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

const LoveFace = ({
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

  const blink = useSharedValue(1);
  const heartScale = useSharedValue(1);

  React.useEffect(() => {
    if (shouldAnimate) {
      blink.value = withRepeat(
        withSequence(
          withDelay(
            Math.random() * 2000 + 3000,
            withTiming(0.1, { duration: 150 }),
          ),
          withTiming(1, { duration: 150 }),
        ),
        -1,
        false,
      );
      heartScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      blink.value = 1;
      heartScale.value = 1;
    }
  }, [shouldAnimate]);

  const blinkProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }] as any,
    originY: 24,
  }));

  const leftHeartProps = useAnimatedProps(() => ({
    transform: [{ scale: heartScale.value }] as any,
    originX: 16.8,
    originY: 26,
  }));

  const rightHeartProps = useAnimatedProps(() => ({
    transform: [{ scale: heartScale.value }] as any,
    originX: 31.2,
    originY: 26,
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
            id="love_mask"
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
        <G mask="url(#love_mask)">
          {/* Background - Hot Pink */}
          <Path
            fill="#E91E63"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
          <G>
            {/* Face Shape - Light Pink */}
            <Path
              fill="#F8BBD0"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          <AnimatedG animatedProps={blinkProps}>
            {/* Eyes (White) */}
            <Path
              fill="#fff"
              d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            <Path
              fill="#fff"
              d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
            />
            {/* Pupils (Heart Shapes) */}
            <AnimatedPath
              fill="#C2185B"
              d="M16.8 22 C 14 20, 12 22, 12 24 C 12 27, 16.8 30, 16.8 30 C 16.8 30, 21.6 27, 21.6 24 C 21.6 22, 19.6 20, 16.8 22 Z"
              animatedProps={leftHeartProps}
            />
            <AnimatedPath
              fill="#C2185B"
              d="M31.2 22 C 28.4 20, 26.4 22, 26.4 24 C 26.4 27, 31.2 30, 31.2 30 C 31.2 30, 36 27, 36 24 C 36 22, 34 20, 31.2 22 Z"
              animatedProps={rightHeartProps}
            />
          </AnimatedG>

          {/* Happy Mouth */}
          <Path
            stroke="#C2185B"
            strokeWidth="3"
            strokeLinecap="round"
            d="M18 34 Q 24 38, 30 34"
          />
          {/* Blush marks */}
          <Path fill="#F48FB1" d="M8 28 a 3 2 0 1 0 6 0 a 3 2 0 1 0 -6 0" />
          <Path fill="#F48FB1" d="M34 28 a 3 2 0 1 0 6 0 a 3 2 0 1 0 -6 0" />
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(LoveFace);
